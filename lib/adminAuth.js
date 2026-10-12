import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

/**
 * Get configured admin secrets.
 * Accepts 'Godisgood123' and process.env.ADMIN_SECRET.
 */
export function getAdminSecrets() {
  const secrets = ["Godisgood123"];
  if (process.env.ADMIN_SECRET && process.env.ADMIN_SECRET.trim().length > 0) {
    const envSecret = process.env.ADMIN_SECRET.trim();
    if (!secrets.includes(envSecret)) {
      secrets.push(envSecret);
    }
  }
  return secrets;
}

export function getAdminSecret() {
  return process.env.ADMIN_SECRET?.trim() || "Godisgood123";
}

/**
 * Validate admin secret using constant-time comparison
 */
export function isValidAdminSecret(input) {
  if (!input || typeof input !== "string") return false;
  const trimmed = input.trim();
  const secrets = getAdminSecrets();
  return secrets.some((s) => safeCompare(trimmed, s));
}

/**
 * Generate a cryptographically signed session token based on the admin secret.
 * The raw secret is never stored in browser cookies.
 */
export function getAdminSessionToken(secret) {
  return crypto
    .createHmac("sha256", secret || "Godisgood123")
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
  const secrets = getAdminSecrets();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE)?.value;

  if (sessionToken) {
    for (const secret of secrets) {
      const validToken = getAdminSessionToken(secret);
      if (safeCompare(sessionToken, validToken)) {
        return true;
      }
    }
  }

  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      for (const secret of secrets) {
        const validToken = getAdminSessionToken(secret);
        if (safeCompare(token, secret) || safeCompare(token, validToken)) {
          return true;
        }
      }
    }
  }

  return false;
}
