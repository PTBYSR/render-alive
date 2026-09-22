import { cookies } from "next/headers";

const COOKIE_NAME = "ro_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Read the anonymous userId from the cookie.
 * Returns null if not set (middleware should have set it).
 */
export async function getUserId() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value || null;
}

export { COOKIE_NAME, COOKIE_MAX_AGE };
