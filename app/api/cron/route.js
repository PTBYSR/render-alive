import { NextResponse } from "next/server";
import redis from "@/lib/redis";

/**
 * GET /api/cron — Ping all due URLs
 *
 * Protected by CRON_SECRET via:
 *  - Authorization: Bearer <secret> header (Vercel Cron)
 *  - ?secret=<secret> query param (external cron services)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const cronSecret = process.env.CRON_SECRET;

  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const querySecret = searchParams.get("secret");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const isDev = process.env.NODE_ENV === "development";
  if (
    !isDev &&
    cronSecret &&
    cronSecret !== "your-secret-here" &&
    bearerToken !== cronSecret &&
    querySecret !== cronSecret
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();

  // Get all service IDs that are due for a ping (nextPingAt <= now)
  const dueServiceIds = await redis.zrange("due_pings", 0, now, {
    byScore: true,
  });

  if (!dueServiceIds || dueServiceIds.length === 0) {
    return NextResponse.json({ pinged: 0, results: [] });
  }

  // Fetch all due service details
  const pipeline = redis.pipeline();
  for (const id of dueServiceIds) {
    pipeline.hgetall(`svc:${id}`);
  }
  const services = await pipeline.exec();

  const results = [];

  // Ping each due service
  for (const service of services) {
    const isActive = service && (service.active === true || service.active === "true");
    if (!service || !isActive) {
      // Inactive or deleted — remove from due_pings
      if (service?.id) {
        await redis.zrem("due_pings", service.id);
      }
      continue;
    }

    let status = 0;
    let isHtml = service.isHtml;
    let canIframe = service.canIframe;
    const pingStart = Date.now();
    let latencyMs = 0;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout for Render cold starts

      const response = await fetch(service.url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "RenderKeepAlive/1.0",
        },
      });

      clearTimeout(timeout);
      latencyMs = Date.now() - pingStart;
      status = response.status;

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const hasHtml = contentType.includes("text/html");
      const xFrame = (response.headers.get("x-frame-options") || "").toLowerCase();
      const csp = (response.headers.get("content-security-policy") || "").toLowerCase();
      const allowsIframe =
        hasHtml &&
        !xFrame.includes("deny") &&
        !xFrame.includes("sameorigin") &&
        !csp.includes("frame-ancestors 'none'") &&
        !csp.includes("frame-ancestors 'self'");

      isHtml = hasHtml ? "true" : "false";
      canIframe = allowsIframe ? "true" : "false";
    } catch {
      status = 0; // Network error or timeout
      latencyMs = Date.now() - pingStart;
    }

    const interval = Number(service.interval) || 840;
    const nextPingAt = now + interval * 1000;

    // Update service status in Redis
    const updatePipeline = redis.pipeline();
    const updates = {
      lastPingAt: String(now),
      lastStatus: String(status),
      nextPingAt: String(nextPingAt),
      lastLatency: String(latencyMs),
    };
    if (isHtml !== undefined) updates.isHtml = isHtml;
    if (canIframe !== undefined) updates.canIframe = canIframe;

    updatePipeline.hset(`svc:${service.id}`, updates);
    updatePipeline.zadd("due_pings", { score: nextPingAt, member: service.id });
    await updatePipeline.exec();

    results.push({
      id: service.id,
      url: service.url,
      status,
      nextPingAt,
    });
  }

  return NextResponse.json({
    pinged: results.length,
    timestamp: now,
    results,
  });
}
