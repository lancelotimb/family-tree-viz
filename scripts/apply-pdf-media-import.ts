import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseGedcom } from "../components/family-tree/gedcomParser";
import {
  extractGedcomHead,
  serializeGedcom,
} from "../components/family-tree/gedcomSerialize";
import type { FamilyGraph } from "../components/family-tree/types";
import { readGedcom, writeGedcom } from "../lib/gedcomStore";
import {
  buildMediaBlobPath,
  extensionForMime,
  MAX_MEDIA_BYTES,
  storeMediaFile,
  validateImageMimeType,
} from "../lib/mediaStore";
import { loadProjectEnv } from "./loadEnv";
import type { PdfMediaManifest, PdfMediaManifestImage } from "./pdfMediaImportTypes";

type CliOptions = {
  manifestPath: string;
  dryRun: boolean;
};

type ApplyResult = {
  uploaded: number;
  skipped: number;
  errors: string[];
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function usage(): never {
  console.error(`Usage:
  npm run pdf-media:apply -- --manifest data/pdf-media-import/manifest.json [--dry-run]

Before applying, edit each image entry:
  "accepted": true
  "taggedPersonIds": ["P_someone"]
  "legend": "Optional caption"`);
  process.exit(1);
}

function parseArgs(argv: string[]): CliOptions {
  let manifestPath = "data/pdf-media-import/manifest.json";
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--manifest") {
      manifestPath = argv[++i] ?? "";
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
    }
  }

  if (!manifestPath) usage();
  return { manifestPath: path.resolve(manifestPath), dryRun };
}

async function readManifest(manifestPath: string): Promise<PdfMediaManifest> {
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw) as PdfMediaManifest;
  if (manifest.version !== 1 || !Array.isArray(manifest.images)) {
    throw new Error("Unsupported or invalid PDF media manifest.");
  }
  return manifest;
}

function contentTypeFor(fileName: string): string {
  const ext = path.extname(fileName).replace(".", "").toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

function safeMediaId(id: string): string {
  const normalized = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return normalized.startsWith("M_") ? normalized : `M_${normalized}`;
}

function validateImage(
  graph: FamilyGraph,
  image: PdfMediaManifestImage,
): string | null {
  if (!image.accepted) return "not accepted";
  if (image.taggedPersonIds.length === 0) return "no tagged people";
  for (const personId of image.taggedPersonIds) {
    if (!graph.individuals[personId]) {
      return `unknown person id "${personId}"`;
    }
  }
  const contentType = contentTypeFor(image.fileName);
  if (!validateImageMimeType(contentType)) {
    return `unsupported image type "${contentType}"`;
  }
  if (image.byteSize > MAX_MEDIA_BYTES) {
    return `image exceeds ${Math.round(MAX_MEDIA_BYTES / 1024 / 1024)} MB limit`;
  }
  return null;
}

async function applyManifest(options: CliOptions): Promise<ApplyResult> {
  loadProjectEnv();

  const manifest = await readManifest(options.manifestPath);
  const manifestDir = path.dirname(options.manifestPath);
  const gedcomText = await readGedcom();
  const graph = parseGedcom(gedcomText);
  const result: ApplyResult = { uploaded: 0, skipped: 0, errors: [] };

  for (const image of manifest.images) {
    const mediaId = safeMediaId(image.id);
    if (graph.media[mediaId]) {
      result.skipped++;
      continue;
    }

    const validationError = validateImage(graph, image);
    if (validationError) {
      result.skipped++;
      if (image.accepted) result.errors.push(`${image.id}: ${validationError}`);
      continue;
    }

    const contentType = contentTypeFor(image.fileName);
    const extension = extensionForMime(contentType);
    const absoluteImagePath = path.resolve(manifestDir, image.extractedPath);
    const buffer = await readFile(absoluteImagePath);
    if (buffer.byteLength > MAX_MEDIA_BYTES) {
      result.skipped++;
      result.errors.push(`${image.id}: extracted file exceeds size limit`);
      continue;
    }

    const url = options.dryRun
      ? `dry-run://${mediaId}.${extension}`
      : await storeMediaFile(
          buffer,
          buildMediaBlobPath("gallery", mediaId, extension),
          contentType,
        );

    graph.media[mediaId] = {
      id: mediaId,
      url,
      legend: image.legend.trim() || image.captionText.trim(),
      taggedPersonIds: [...new Set(image.taggedPersonIds)],
    };
    result.uploaded++;
  }

  if (!options.dryRun && result.uploaded > 0) {
    const nextGedcom = serializeGedcom(graph, extractGedcomHead(gedcomText));
    await writeGedcom(nextGedcom);
  }

  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await applyManifest(options);

  console.log(`${options.dryRun ? "Would import" : "Imported"} ${result.uploaded} image(s).`);
  console.log(`Skipped ${result.skipped} image(s).`);
  for (const error of result.errors) {
    console.log(`Warning: ${error}`);
  }
  if (options.dryRun) {
    console.log("Dry run only; no files were uploaded and GEDCOM was not written.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
