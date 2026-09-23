import { NextResponse } from "next/server";
import redis from "@/lib/redis";
import {
  ADMIN_COOKIE,
  getAdminSecret,
  getAdminSessionToken,
  safeCompare,
  isAuthorizedAdmin,
} from "@/lib/adminAuth";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 900; // 15 minutes

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "anonymous_ip";
}

/**
 * GET /api/admin/auth — Check if current session is authenticated as admin
 */
export async function GET(request) {
  const authenticated = await isAuthorizedAdmin(request);
  return NextResponse.json({ authenticated });
}

/**
 * POST /api/admin/auth — Authenticate admin with secret key & brute-force protection
 */
export async function POST(request) {
  const ip = getClientIp(request);
  const lockoutKey = `admin_lockout:${ip}`;
  const attemptsKey = `admin_attempts:${ip}`;

  // 1. Check if IP is currently locked out
  const isLocked = await redis.get(lockoutKey);
  if (isLocked) {
    const ttl = await redis.ttl(lockoutKey);
    const minutesLeft = Math.max(1, Math.ceil(ttl / 60));
    return NextResponse.json(
      {
        error: `Too many failed attempts. Admin access locked. Try again in ${minutesLeft} minute${
          minutesLeft === 1 ? "" : "s"
        }.`,
      },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { secret } = body;
  const expectedSecret = getAdminSecret();

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Admin access is disabled. ADMIN_SECRET is not configured." },
      { status: 503 }
    );
  }

  // 2. Validate secret using constant-time comparison
  const isValid = safeCompare(secret?.trim(), expectedSecret);

  if (!isValid) {
    // Increment failed attempt counter
    const attempts = await redis.incr(attemptsKey);
    if (attempts === 1) {
      await redis.expire(attemptsKey, LOCKOUT_SECONDS);
    }

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      await redis.set(lockoutKey, "locked", { ex: LOCKOUT_SECONDS });
      await redis.del(attemptsKey);
      return NextResponse.json(
        {
          error:
            "Too many failed attempts. Admin access has been locked for 15 minutes.",
        },
        { status: 429 }
      );
    }

    const remaining = MAX_FAILED_ATTEMPTS - attempts;
    return NextResponse.json(
      {
        error: `Invalid admin key. ${remaining} attempt${
          remaining === 1 ? "" : "s"
        } remaining before lockout.`,
      },
      { status: 401 }
    );
  }

  // 3. Reset failed attempts upon successful login
  await redis.del(attemptsKey);
  await redis.del(lockoutKey);

  // 4. Issue cryptographically signed session cookie (HMAC token, never raw secret)
  const sessionToken = getAdminSessionToken(expectedSecret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}

/**
 * DELETE /api/admin/auth — Log out admin
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
