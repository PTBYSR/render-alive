import { NextResponse } from "next/server";
import redis from "@/lib/redis";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

/**
 * Ensure existing users are indexed into "all_users" set
 */
async function syncAllUsers() {
  const keys = await redis.keys("user:*:urls");
  if (!keys || keys.length === 0) return [];

  const userIds = keys
    .map((k) => {
      const match = k.match(/^user:(.+):urls$/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  if (userIds.length > 0) {
    const pipeline = redis.pipeline();
    for (const id of userIds) {
      pipeline.sadd("all_users", id);
    }
    await pipeline.exec();
  }

  return userIds;
}

/**
 * GET /api/admin/users — List all users or view single user if ?id= is given
 */
export async function GET(request) {
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("id");

  // Sync users in background if needed
  await syncAllUsers();

  // If specific user detail requested
  if (targetUserId) {
    const userProfile = (await redis.hgetall(`user:${targetUserId}`)) || {};
    const serviceIds = (await redis.smembers(`user:${targetUserId}:urls`)) || [];
    let services = [];

    if (serviceIds.length > 0) {
      const pipeline = redis.pipeline();
      for (const id of serviceIds) {
        pipeline.hgetall(`svc:${id}`);
      }
      services = (await pipeline.exec())
        .filter(Boolean)
        .sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
    }

    const authProvider = userProfile.authProvider
      ? userProfile.authProvider
      : userProfile.passwordHash
      ? "Email/Password"
      : userProfile.image || userProfile.email
      ? "Google"
      : "Device ID";

    return NextResponse.json({
      userId: targetUserId,
      email: userProfile.email || "",
      name: userProfile.name || "",
      ip: userProfile.lastIp || userProfile.ip || "",
      country: userProfile.country || "",
      city: userProfile.city || "",
      authProvider,
      createdAt: userProfile.createdAt || "",
      serviceCount: services.length,
      activeCount: services.filter((s) => s.active === true || s.active === "true").length,
      services,
    });
  }

  // Otherwise, list all users
  const allUserIds = await redis.smembers("all_users");
  if (!allUserIds || allUserIds.length === 0) {
    return NextResponse.json({
      totalUsers: 0,
      totalServices: 0,
      activeServices: 0,
      users: [],
    });
  }

  let totalServices = 0;
  let activeServices = 0;
  const usersList = [];

  for (const uid of allUserIds) {
    const userProfile = (await redis.hgetall(`user:${uid}`)) || {};
    const serviceIds = (await redis.smembers(`user:${uid}:urls`)) || [];

    let userServices = [];
    if (serviceIds.length > 0) {
      const pipeline = redis.pipeline();
      for (const sid of serviceIds) {
        pipeline.hgetall(`svc:${sid}`);
      }
      userServices = (await pipeline.exec()).filter(Boolean);
    }

    const activeCount = userServices.filter(
      (s) => s.active === true || s.active === "true"
    ).length;

    totalServices += userServices.length;
    activeServices += activeCount;

    // Find latest activity
    let latestPing = 0;
    let earliestCreated = Infinity;
    for (const s of userServices) {
      if (s.lastPingAt && Number(s.lastPingAt) > latestPing) {
        latestPing = Number(s.lastPingAt);
      }
      if (s.createdAt && Number(s.createdAt) < earliestCreated) {
        earliestCreated = Number(s.createdAt);
      }
    }

    const authProvider = userProfile.authProvider
      ? userProfile.authProvider
      : userProfile.passwordHash
      ? "Email"
      : userProfile.image || userProfile.email
      ? "Google"
      : "Device ID";

    usersList.push({
      userId: uid,
      email: userProfile.email || "",
      name: userProfile.name || "",
      ip: userProfile.lastIp || userProfile.ip || "",
      country: userProfile.country || "",
      city: userProfile.city || "",
      authProvider,
      serviceCount: userServices.length,
      activeCount,
      pausedCount: userServices.length - activeCount,
      latestPingAt: latestPing > 0 ? String(latestPing) : "",
      createdAt: userProfile.createdAt || (earliestCreated !== Infinity ? String(earliestCreated) : ""),
      urls: userServices.map((s) => s.url),
      services: userServices,
    });
  }

  // Sort by latest ping or creation date descending
  usersList.sort((a, b) => {
    const timeA = Number(a.latestPingAt || a.createdAt || 0);
    const timeB = Number(b.latestPingAt || b.createdAt || 0);
    return timeB - timeA;
  });

  return NextResponse.json({
    totalUsers: usersList.length,
    totalServices,
    activeServices,
    users: usersList,
  });
}
