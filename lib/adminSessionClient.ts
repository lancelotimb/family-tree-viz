/** Establish an admin session cookie from the shared secret. */
export async function establishAdminSession(key: string): Promise<boolean> {
  const response = await fetch("/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  return response.ok;
}

/** Clear the admin session cookie. */
export async function clearAdminSession(): Promise<void> {
  await fetch("/api/admin/session", { method: "DELETE" });
}
