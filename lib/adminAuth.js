import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

/**
 * Get configured admin secret.
 * Requires process.env.ADMIN_SECRET to be explicitly set.
 */
export function getAdminSecret() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || typeof secret !== "string" || secret.trim().length === 0) {
    return null;
  }
  return secret.trim();
}

/**
 * Generate a cryptographically signed session token based on the admin secret.
 * The raw secret is never stored in browser cookies.
 */
export function getAdminSessionToken(secret) {
  return crypto
    .createHmac("sha256", secret)
    .update("render-alive-admin-session-v2")
    .digest("hex");
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function safeCompare(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify whether the incoming request has valid admin credentials
 */
export async function isAuthorizedAdmin(request) {
  const secret = getAdminSecret();
  if (!secret) return false;

  const validToken = getAdminSessionToken(secret);

  // 1. Check signed cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE)?.value;
  if (sessionToken && safeCompare(sessionToken, validToken)) {
    return true;
  }

  // 2. Check Authorization Bearer header
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (safeCompare(token, secret) || safeCompare(token, validToken)) {
        return true;
      }
    }
  }

  return false;
}
