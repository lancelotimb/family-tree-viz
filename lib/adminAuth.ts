import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "gedcom-admin";

function adminCookieValue(): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update("gedcom-admin").digest("hex");
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_SECRET?.trim());
}

export function createAdminSessionCookie(): string {
  const value = adminCookieValue();
  if (!value) {
    throw new Error("ADMIN_SECRET is not configured");
  }
  return value;
}

export function verifyAdminKey(key: string): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  try {
    return timingSafeEqual(Buffer.from(key), Buffer.from(secret));
  } catch {
    return false;
  }
}

export async function hasAdminSession(): Promise<boolean> {
  if (!isAdminAuthConfigured()) return true;
  const expected = adminCookieValue();
  if (!expected) return false;
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!session) return false;
  try {
    return timingSafeEqual(Buffer.from(session), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function verifyAuthorizationHeader(header: string | null): boolean {
  if (!isAdminAuthConfigured()) return true;
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length);
  const secret = process.env.ADMIN_SECRET!;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return false;
  }
}
