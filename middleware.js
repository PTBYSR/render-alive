import { NextResponse } from "next/server";

const COOKIE_NAME = "ro_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function middleware(request) {
  const response = NextResponse.next();
  const existing = request.cookies.get(COOKIE_NAME);

  if (!existing) {
    const userId = crypto.randomUUID();
    response.cookies.set(COOKIE_NAME, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  return response;
}

// Run middleware on all routes
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
