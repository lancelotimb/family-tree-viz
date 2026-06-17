import {
  ADMIN_COOKIE_NAME,
  createAdminSessionCookie,
  isAdminAuthConfigured,
  verifyAdminKey,
} from "@/lib/adminAuth";

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return Response.json({ ok: true, auth: "disabled" });
  }

  const body = (await request.json().catch(() => null)) as { key?: string } | null;
  const key = body?.key?.trim();
  if (!key || !verifyAdminKey(key)) {
    return Response.json({ error: "Invalid admin key" }, { status: 401 });
  }

  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=${createAdminSessionCookie()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
  return response;
}

export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
  return response;
}
