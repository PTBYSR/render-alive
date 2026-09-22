import { NextResponse } from "next/server";
import redis from "@/lib/redis";
import { getUserId } from "@/lib/userId";

const MAX_URLS = 3;
const MIN_INTERVAL = 300;  // 5 minutes
const MAX_INTERVAL = 1800; // 30 minutes
const DEFAULT_INTERVAL = 840; // 14 minutes

/**
 * Pre-flight verification of Render URLs
 */
async function verifyRenderUrl(url) {
  const parsed = new URL(url);
  const isRenderDomain = parsed.hostname.endsWith(".onrender.com");

  let isRender = isRenderDomain;
  let isHtml = false;
  let canIframe = false;
  let status = null;
  let isWaking = false;
  let latencyMs = 0;

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s preflight timeout

    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "RenderKeepAlive/1.0 (Verification)",
      },
    });

    clearTimeout(timeout);
    latencyMs = Date.now() - startTime;
    status = res.status;

    // Check Render headers
    const hasRndrId = !!res.headers.get("rndr-id");
    const serverHeader = (res.headers.get("server") || "").toLowerCase();
    if (hasRndrId || serverHeader.includes("render")) {
      isRender = true;
    }

    // Check HTML & iframe allowance
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("text/html")) {
      isHtml = true;

      const xFrame = (res.headers.get("x-frame-options") || "").toLowerCase();
      const csp = (res.headers.get("content-security-policy") || "").toLowerCase();

      const blocksIframe =
        xFrame.includes("deny") ||
        xFrame.includes("sameorigin") ||
        csp.includes("frame-ancestors 'none'") ||
        csp.includes("frame-ancestors 'self'");

      canIframe = !blocksIframe;
    }
  } catch (err) {
    latencyMs = Date.now() - startTime;
    if (isRenderDomain) {
      // It's a valid .onrender.com domain, but cold-starting or took >6s
      isWaking = true;
    } else {
      throw new Error("Could not reach service or verify host.");
    }
  }

  if (!isRender) {
    throw new Error(
      "URL does not appear to be a Render service (must end in .onrender.com or return a Render header)."
    );
  }

  return {
    isRender,
    isHtml,
    canIframe,
    status: isWaking ? "waking" : (status ? String(status) : ""),
    latencyMs: isWaking ? 0 : latencyMs,
    isWaking,
  };
}

/**
 * GET /api/urls — List all monitored services for the current user
 * Or GET /api/urls?check={id} to check/wake a specific service
 */
export async function GET(request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "No user ID" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const checkId = searchParams.get("check");

  if (checkId) {
    const service = await redis.hgetall(`svc:${checkId}`);
    if (!service || service.userId !== userId) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Attempt a live ping to check if it has woken up
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const start = Date.now();

      const res = await fetch(service.url, {
        method: "GET",
        signal: controller.signal,
        headers: { "User-Agent": "RenderKeepAlive/1.0" },
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - start;
      const status = res.status;
      const now = Date.now();

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      const isHtml = contentType.includes("text/html");
      const xFrame = (res.headers.get("x-frame-options") || "").toLowerCase();
      const csp = (res.headers.get("content-security-policy") || "").toLowerCase();
      const canIframe =
        isHtml &&
        !xFrame.includes("deny") &&
        !xFrame.includes("sameorigin") &&
        !csp.includes("frame-ancestors 'none'") &&
        !csp.includes("frame-ancestors 'self'");

      const updates = {
        lastPingAt: String(now),
        lastStatus: String(status),
        isHtml: isHtml ? "true" : "false",
        canIframe: canIframe ? "true" : "false",
        lastLatency: String(latencyMs),
      };

      await redis.hset(`svc:${checkId}`, updates);
      return NextResponse.json({ ...service, ...updates, isWaking: false });
    } catch {
      // Still asleep / waiting
      return NextResponse.json({ ...service, isWaking: true });
    }
  }

  const serviceIds = await redis.smembers(`user:${userId}:urls`);
  if (!serviceIds || serviceIds.length === 0) {
    return NextResponse.json([]);
  }

  // Pipeline fetch all service hashes
  const pipeline = redis.pipeline();
  for (const id of serviceIds) {
    pipeline.hgetall(`svc:${id}`);
  }
  const results = await pipeline.exec();

  // Filter out null results and sort by createdAt
  const services = results
    .filter(Boolean)
    .sort((a, b) => Number(a.createdAt) - Number(b.createdAt));

  return NextResponse.json(services);
}

/**
 * POST /api/urls — Add a new monitored service
 * Body: { url: string, interval?: number }
 */
export async function POST(request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "No user ID" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url, interval: rawInterval } = body;

  // Validate URL
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  if (parsed.protocol !== "https:") {
    return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
  }

  // Check limit
  const count = await redis.scard(`user:${userId}:urls`);
  if (count >= MAX_URLS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_URLS} services allowed` },
      { status: 409 }
    );
  }

  // Check for duplicate URL
  const existingIds = await redis.smembers(`user:${userId}:urls`);
  if (existingIds && existingIds.length > 0) {
    const pipeline = redis.pipeline();
    for (const id of existingIds) {
      pipeline.hget(`svc:${id}`, "url");
    }
    const urls = await pipeline.exec();
    if (urls.some((u) => u === url)) {
      return NextResponse.json(
        { error: "This URL is already being monitored" },
        { status: 409 }
      );
    }
  }

  // Verify Render host and pre-flight check
  let checkResult;
  try {
    checkResult = await verifyRenderUrl(url);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // Clamp interval
  const interval = Math.min(
    MAX_INTERVAL,
    Math.max(MIN_INTERVAL, Number(rawInterval) || DEFAULT_INTERVAL)
  );

  const serviceId = "svc_" + crypto.randomUUID().slice(0, 8);
  const now = Date.now();
  const nextPingAt = now + interval * 1000;

  const service = {
    id: serviceId,
    userId,
    url,
    active: "true",
    interval: String(interval),
    createdAt: String(now),
    lastPingAt: checkResult.isWaking ? "" : String(now),
    lastStatus: checkResult.status,
    nextPingAt: String(nextPingAt),
    isRender: checkResult.isRender ? "true" : "false",
    isHtml: checkResult.isHtml ? "true" : "false",
    canIframe: checkResult.canIframe ? "true" : "false",
    lastLatency: String(checkResult.latencyMs),
  };

  // Pipeline: create hash + add to user set + add to due_pings sorted set + index user
  const pipeline = redis.pipeline();
  pipeline.hset(`svc:${serviceId}`, service);
  pipeline.sadd(`user:${userId}:urls`, serviceId);
  pipeline.sadd("all_users", userId);
  pipeline.zadd("due_pings", { score: nextPingAt, member: serviceId });
  await pipeline.exec();

  return NextResponse.json(service, { status: 201 });
}

/**
 * DELETE /api/urls?id={serviceId} — Remove a monitored service
 */
export async function DELETE(request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "No user ID" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("id");

  if (!serviceId) {
    return NextResponse.json({ error: "Service ID required" }, { status: 400 });
  }

  // Verify ownership
  const owner = await redis.hget(`svc:${serviceId}`, "userId");
  if (owner !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Pipeline: delete hash + remove from user set + remove from due_pings
  const pipeline = redis.pipeline();
  pipeline.del(`svc:${serviceId}`);
  pipeline.srem(`user:${userId}:urls`, serviceId);
  pipeline.zrem("due_pings", serviceId);
  await pipeline.exec();

  const remaining = await redis.scard(`user:${userId}:urls`);
  if (remaining === 0) {
    await redis.srem("all_users", userId);
  }

  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/urls — Update a service (toggle active, change interval)
 * Body: { id: string, active?: boolean, interval?: number }
 */
export async function PATCH(request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "No user ID" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id: serviceId, active, interval: rawInterval } = body;

  if (!serviceId) {
    return NextResponse.json({ error: "Service ID required" }, { status: 400 });
  }

  // Verify ownership
  const existing = await redis.hgetall(`svc:${serviceId}`);
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates = {};
  const now = Date.now();

  // Handle active toggle
  if (typeof active === "boolean") {
    updates.active = active ? "true" : "false";
  } else if (active !== undefined) {
    updates.active = String(active) === "true" ? "true" : "false";
  }

  // Handle interval change
  if (rawInterval !== undefined) {
    updates.interval = String(
      Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, Number(rawInterval) || DEFAULT_INTERVAL))
    );
  }

  // Determine the effective active state and interval
  const effectiveActive = String(updates.active ?? existing.active) === "true";
  const effectiveInterval = Number(updates.interval ?? existing.interval);

  // Recalculate nextPingAt if activating or changing interval
  if (effectiveActive && (updates.active !== undefined || updates.interval !== undefined)) {
    const nextPingAt = now + effectiveInterval * 1000;
    updates.nextPingAt = String(nextPingAt);

    // Update sorted set
    await redis.zadd("due_pings", { score: nextPingAt, member: serviceId });
  }

  // If deactivating, remove from due_pings
  if (!effectiveActive && updates.active !== undefined) {
    updates.nextPingAt = "";
    await redis.zrem("due_pings", serviceId);
  }

  // Apply updates
  if (Object.keys(updates).length > 0) {
    await redis.hset(`svc:${serviceId}`, updates);
  }

  // Return updated service
  const updated = await redis.hgetall(`svc:${serviceId}`);
  return NextResponse.json(updated);
}
