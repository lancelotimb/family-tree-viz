import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, get, put } from "@vercel/blob";
import { isBlobOidcEnvironmentError, LOCAL_BLOB_SETUP_HELP } from "./blobLocalSetup";

const LOCAL_MEDIA_ROOT = path.join(process.cwd(), "data", "media");

function getBlobReadWriteToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token || undefined;
}

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL_REGION);
}

function canUseBlobOidc(): boolean {
  return (
    isVercelRuntime() &&
    Boolean(process.env.BLOB_STORE_ID?.trim() && process.env.VERCEL_OIDC_TOKEN?.trim())
  );
}

export function hasMediaBlobCredentials(): boolean {
  return Boolean(getBlobReadWriteToken()) || canUseBlobOidc();
}

function blobPrivateOptions(): { access: "private"; token?: string } {
  const token = getBlobReadWriteToken();
  if (token) return { token, access: "private" };
  return { access: "private" };
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

export function validateImageMimeType(contentType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(contentType);
}

export function extensionForMime(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/jpeg":
      return "jpg";
    default:
      return "webp";
  }
}

function buildMediaServeUrl(blobPath: string): string {
  return `/api/media/serve/${blobPath.split("/").map(encodeURIComponent).join("/")}`;
}

/** Persist image bytes and return an app-served URL. */
export async function storeMediaFile(
  buffer: Buffer,
  blobPath: string,
  contentType: string,
): Promise<string> {
  if (hasMediaBlobCredentials()) {
    try {
      await put(blobPath, buffer, {
        ...blobPrivateOptions(),
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
      });
      return buildMediaServeUrl(blobPath);
    } catch (error) {
      if (!getBlobReadWriteToken() && isBlobOidcEnvironmentError(error)) {
        throw new Error(LOCAL_BLOB_SETUP_HELP);
      }
      throw error;
    }
  }

  const localPath = path.join(LOCAL_MEDIA_ROOT, blobPath);
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, buffer);
  return buildMediaServeUrl(blobPath);
}

/** Read a locally stored media file (dev fallback when Blob is unavailable). */
export async function readLocalMediaFile(relativePath: string): Promise<Buffer | null> {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const localPath = path.join(LOCAL_MEDIA_ROOT, normalized);
  if (!localPath.startsWith(LOCAL_MEDIA_ROOT)) return null;
  try {
    return await readFile(localPath);
  } catch {
    return null;
  }
}

/** Read a media file from Blob when configured, otherwise from the local dev fallback. */
export async function readMediaFile(relativePath: string): Promise<Buffer | null> {
  if (hasMediaBlobCredentials()) {
    try {
      const result = await get(relativePath, blobPrivateOptions());
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    } catch (error) {
      if (error instanceof BlobNotFoundError) return null;
      if (!getBlobReadWriteToken() && isBlobOidcEnvironmentError(error)) {
        throw new Error(LOCAL_BLOB_SETUP_HELP);
      }
      throw error;
    }
  }

  return readLocalMediaFile(relativePath);
}

export function buildMediaBlobPath(
  kind: "avatar" | "gallery",
  id: string,
  extension: string,
): string {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const uuid = crypto.randomUUID();
  if (kind === "avatar") {
    return `media/avatars/${safeId}/${uuid}.${extension}`;
  }
  return `media/gallery/${safeId}/${uuid}.${extension}`;
}
