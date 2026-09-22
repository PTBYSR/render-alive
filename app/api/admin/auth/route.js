import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "admin_session";

function getExpectedSecret() {
  return (
    process.env.ADMIN_SECRET ||
    process.env.CRON_SECRET ||
    "render-admin-secret-2026"
  );
}

/**
 * GET /api/admin/auth — Check if current session is authenticated as admin
 */
export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE)?.value;
  const expected = getExpectedSecret();

  const isAuthenticated = session === expected;
  return NextResponse.json({ authenticated: isAuthenticated });
}

/**
 * POST /api/admin/auth — Authenticate admin with secret key
 * Body: { secret: string }
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { secret } = body;
  const expected = getExpectedSecret();

  if (!secret || secret.trim() !== expected.trim()) {
    return NextResponse.json({ error: "Invalid admin key" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
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
