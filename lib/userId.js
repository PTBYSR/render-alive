import { cookies } from "next/headers";
import { auth } from "@/auth";
import redis from "@/lib/redis";

const COOKIE_NAME = "ro_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Migrate services from an anonymous device ID to an authenticated user ID
 */
async function migrateAnonymousServices(anonId, authenticatedId) {
  if (!anonId || !authenticatedId || anonId === authenticatedId) return;

  const serviceIds = await redis.smembers(`user:${anonId}:urls`);
  if (!serviceIds || serviceIds.length === 0) return;

  const pipeline = redis.pipeline();
  for (const id of serviceIds) {
    pipeline.hset(`svc:${id}`, { userId: authenticatedId });
    pipeline.sadd(`user:${authenticatedId}:urls`, id);
    pipeline.srem(`user:${anonId}:urls`, id);
  }
  pipeline.sadd("all_users", authenticatedId);
  pipeline.srem("all_users", anonId);
  await pipeline.exec();
}

/**
 * Get current effective user ID (session user ID if authenticated, else anonymous cookie).
 * Automatically links and migrates anonymous services when the user logs in.
 */
export async function getUserId() {
  const session = await auth();
  const cookieStore = await cookies();
  const anonCookie = cookieStore.get(COOKIE_NAME)?.value;

  if (session?.user?.id) {
    const authenticatedId = session.user.id;
    if (anonCookie && anonCookie !== authenticatedId) {
      await migrateAnonymousServices(anonCookie, authenticatedId);
    }
    return authenticatedId;
  }

  return anonCookie || null;
}

export { COOKIE_NAME, COOKIE_MAX_AGE };
