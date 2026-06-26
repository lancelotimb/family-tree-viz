export async function uploadMediaFile(
  file: Blob,
  kind: "avatar" | "gallery",
  options?: { personId?: string; mediaId?: string; filename?: string },
): Promise<string> {
  const form = new FormData();
  form.append("file", file, options?.filename ?? "image.webp");
  form.append("kind", kind);
  if (options?.personId) form.append("personId", options.personId);
  if (options?.mediaId) form.append("mediaId", options.mediaId);

  const response = await fetch("/api/media", { method: "POST", body: form });
  const payload = (await response.json().catch(() => null)) as
    | { url?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Upload failed");
  }
  if (!payload?.url) {
    throw new Error("Upload did not return a URL");
  }
  return payload.url;
}
