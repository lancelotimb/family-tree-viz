import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, get, put } from "@vercel/blob";
import { parseGedcom } from "@/components/family-tree/gedcomParser";
import { GEDCOM_BLOB_PATH } from "./gedcomConstants";
import { isBlobOidcEnvironmentError, LOCAL_BLOB_SETUP_HELP } from "./blobLocalSetup";

const GEDCOM_FILE_PATH = path.join(process.cwd(), "data", "family-tree.ged");

function getBlobReadWriteToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token || undefined;
}

/** True when running on Vercel infrastructure (not `next dev` / local scripts). */
function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL_REGION);
}

function canUseBlobOidc(): boolean {
  return (
    isVercelRuntime() &&
    Boolean(process.env.BLOB_STORE_ID?.trim() && process.env.VERCEL_OIDC_TOKEN?.trim())
  );
}

function hasBlobCredentials(): boolean {
  return Boolean(getBlobReadWriteToken()) || canUseBlobOidc();
}

function blobPrivateOptions(): { access: "private"; token?: string } {
  const token = getBlobReadWriteToken();
  if (token) {
    // Prefer the read-write token so local scripts never attempt OIDC auth.
    return { token, access: "private" };
  }
  return { access: "private" };
}

async function readSeedGedcom(): Promise<string> {
  return readFile(GEDCOM_FILE_PATH, "utf-8");
}

async function readFromFilesystem(): Promise<string> {
  return readSeedGedcom();
}

async function writeToFilesystem(text: string): Promise<void> {
  await writeFile(GEDCOM_FILE_PATH, text, "utf-8");
}

async function readFromBlob(): Promise<string | null> {
  try {
    const result = await get(GEDCOM_BLOB_PATH, blobPrivateOptions());
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return await new Response(result.stream).text();
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    if (!getBlobReadWriteToken() && isBlobOidcEnvironmentError(error)) {
      throw new Error(LOCAL_BLOB_SETUP_HELP);
    }
    throw error;
  }
}

async function writeToBlob(text: string): Promise<void> {
  try {
    await put(GEDCOM_BLOB_PATH, text, {
      ...blobPrivateOptions(),
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "text/plain; charset=utf-8",
    });
  } catch (error) {
    if (!getBlobReadWriteToken() && isBlobOidcEnvironmentError(error)) {
      throw new Error(LOCAL_BLOB_SETUP_HELP);
    }
    throw error;
  }
}

async function seedBlobFromFilesystem(): Promise<string> {
  const seed = await readSeedGedcom();
  await writeToBlob(seed);
  return seed;
}

/** Validate GEDCOM text; throws on parse failure. */
export function validateGedcom(text: string): void {
  parseGedcom(text);
}

/** Read the canonical GEDCOM document (Blob first, then lazy seed, then local file). */
export async function readGedcom(): Promise<string> {
  if (hasBlobCredentials()) {
    const existing = await readFromBlob();
    if (existing !== null) return existing;
    return seedBlobFromFilesystem();
  }
  return readFromFilesystem();
}

/** Persist GEDCOM text to the canonical store. */
export async function writeGedcom(text: string): Promise<void> {
  validateGedcom(text);
  if (hasBlobCredentials()) {
    await writeToBlob(text);
    return;
  }
  await writeToFilesystem(text);
}

/** Upload the repo seed file to Blob (manual bootstrap). */
export async function seedGedcomBlob(): Promise<void> {
  if (!hasBlobCredentials()) {
    throw new Error(
      "Blob credentials are not configured. Run `vercel env pull .env.local --environment=preview` and ensure BLOB_READ_WRITE_TOKEN is set (OIDC only works on Vercel deployments, not local scripts).",
    );
  }
  const seed = await readSeedGedcom();
  validateGedcom(seed);
  await writeToBlob(seed);
}
