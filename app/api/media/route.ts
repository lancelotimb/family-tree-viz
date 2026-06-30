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
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = form.get("kind");
  const personId = String(form.get("personId") ?? "").trim();
  const mediaId = String(form.get("mediaId") ?? "").trim();

  if (!(file instanceof File)) {
    return Response.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (kind !== "avatar" && kind !== "gallery") {
    return Response.json({ error: "Type invalide" }, { status: 400 });
  }
  if (kind === "avatar" && !personId) {
    return Response.json({ error: "personId est obligatoire pour les avatars" }, { status: 400 });
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return Response.json({ error: "Le fichier dépasse la limite de 5 Mo" }, { status: 400 });
  }

  const contentType = file.type || "application/octet-stream";
  if (!validateImageMimeType(contentType)) {
    return Response.json({ error: "Type d'image non pris en charge" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = extensionForMime(contentType);
  const targetId = kind === "avatar" ? personId : mediaId || randomUUID();
  const blobPath = buildMediaBlobPath(kind, targetId, extension);
  const url = await storeMediaFile(buffer, blobPath, contentType);

  return Response.json({ url });
}
