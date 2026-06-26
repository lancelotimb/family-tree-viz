import { randomUUID } from "node:crypto";
import { hasAdminSession } from "@/lib/adminAuth";
import {
  buildMediaBlobPath,
  extensionForMime,
  MAX_MEDIA_BYTES,
  storeMediaFile,
  validateImageMimeType,
} from "@/lib/mediaStore";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = form.get("kind");
  const personId = String(form.get("personId") ?? "").trim();
  const mediaId = String(form.get("mediaId") ?? "").trim();

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (kind !== "avatar" && kind !== "gallery") {
    return Response.json({ error: "Invalid kind" }, { status: 400 });
  }
  if (kind === "avatar" && !personId) {
    return Response.json({ error: "personId is required for avatars" }, { status: 400 });
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return Response.json({ error: "File exceeds 5 MB limit" }, { status: 400 });
  }

  const contentType = file.type || "application/octet-stream";
  if (!validateImageMimeType(contentType)) {
    return Response.json({ error: "Unsupported image type" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = extensionForMime(contentType);
  const targetId = kind === "avatar" ? personId : mediaId || randomUUID();
  const blobPath = buildMediaBlobPath(kind, targetId, extension);
  const url = await storeMediaFile(buffer, blobPath, contentType);

  return Response.json({ url });
}
