import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { parseGedcom } from "../components/family-tree/gedcomParser";
import type { Individual } from "../components/family-tree/types";
import { readGedcom } from "../lib/gedcomStore";
import { loadProjectEnv } from "./loadEnv";
import type {
  PdfMediaManifest,
  PdfMediaManifestImage,
  PdfMediaPersonSuggestion,
} from "./pdfMediaImportTypes";

type PdfImageListEntry = {
  page: number;
  index: number;
  width: number | null;
  height: number | null;
};

type CliOptions = {
  pdfPath: string;
  outputDir: string;
  overwrite: boolean;
};

function usage(): never {
  console.error(`Usage:
  npm run pdf-media:extract -- --pdf path/to/ancestors.pdf [--out data/pdf-media-import] [--overwrite]

Requires Poppler tools:
  brew install poppler`);
  process.exit(1);
}

function parseArgs(argv: string[]): CliOptions {
  let pdfPath = "";
  let outputDir = "data/pdf-media-import";
  let overwrite = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--pdf") {
      pdfPath = argv[++i] ?? "";
    } else if (arg === "--out") {
      outputDir = argv[++i] ?? "";
    } else if (arg === "--overwrite") {
      overwrite = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
    }
  }

  if (!pdfPath || !outputDir) usage();
  return {
    pdfPath: path.resolve(pdfPath),
    outputDir: path.resolve(outputDir),
    overwrite,
  };
}

function requireCommand(name: string): void {
  const result = spawnSync("sh", ["-lc", `command -v ${name}`], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `Missing required command "${name}". Install Poppler with "brew install poppler".`,
    );
  }
}

async function pathExists(value: string): Promise<boolean> {
  try {
    await stat(value);
    return true;
  } catch {
    return false;
  }
}

function hasCommand(name: string): boolean {
  return spawnSync("sh", ["-lc", `command -v ${name}`]).status === 0;
}

function run(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const output = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (code === 0) {
        resolve(output);
        return;
      }
      reject(
        new Error(
          `${command} exited with ${code ?? "unknown"}:\n${output.stderr || output.stdout}`,
        ),
      );
    });
  });
}

function parsePdfImagesList(output: string): PdfImageListEntry[] {
  const entries: PdfImageListEntry[] = [];
  for (const line of output.split("\n")) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 5 || !/^\d+$/.test(columns[0] ?? "")) continue;
    entries.push({
      page: Number(columns[0]),
      index: Number(columns[1] ?? entries.length),
      width: Number.isFinite(Number(columns[3])) ? Number(columns[3]) : null,
      height: Number.isFinite(Number(columns[4])) ? Number(columns[4]) : null,
    });
  }
  return entries;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pageSnippet(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 1200);
}

function personTerms(person: Individual): string[] {
  return [
    person.name,
    `${person.firstName} ${person.familyName}`,
    person.firstName,
    person.familyName,
    person.middleNames,
    person.birth.year?.toString() ?? "",
    person.death?.year?.toString() ?? "",
  ]
    .map(normalizeText)
    .filter((term) => term.length >= 2);
}

function suggestPeople(
  captionText: string,
  people: Individual[],
): PdfMediaPersonSuggestion[] {
  const haystack = normalizeText(captionText);
  if (!haystack) return [];

  const suggestions = people
    .map((person) => {
      const matchedTerms = new Set<string>();
      let score = 0;
      const fullName = normalizeText(person.name);
      const cardName = normalizeText(`${person.firstName} ${person.familyName}`);

      if (fullName && haystack.includes(fullName)) {
        score += 80;
        matchedTerms.add(person.name);
      }
      if (cardName && cardName !== fullName && haystack.includes(cardName)) {
        score += 70;
        matchedTerms.add(`${person.firstName} ${person.familyName}`);
      }

      const first = normalizeText(person.firstName);
      const family = normalizeText(person.familyName);
      if (first && haystack.includes(first)) {
        score += 15;
        matchedTerms.add(person.firstName);
      }
      if (family && haystack.includes(family)) {
        score += 15;
        matchedTerms.add(person.familyName);
      }

      for (const term of personTerms(person)) {
        if (/^\d{4}$/.test(term) && haystack.includes(term)) {
          score += 10;
          matchedTerms.add(term);
        }
      }

      return {
        personId: person.id,
        name: person.name,
        birthYear: person.birth.year,
        deathYear: person.death?.year ?? null,
        score,
        matchedTerms: [...matchedTerms],
      };
    })
    .filter((suggestion) => suggestion.score >= 30)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return suggestions.slice(0, 8);
}

async function extractPageText(pdfPath: string, outputDir: string): Promise<string[]> {
  if (!hasCommand("pdftotext")) return [];

  const textPath = path.join(outputDir, "pages.txt");
  await run("pdftotext", ["-layout", pdfPath, textPath]);
  const text = await readFile(textPath, "utf8");
  return text.split("\f").map(pageSnippet);
}

async function listExtractedImages(outputDir: string): Promise<string[]> {
  const names = await readdir(outputDir);
  return names
    .filter((name) => /^image-\d+\.(jpe?g|png|ppm|pbm|pgm|tif|tiff)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function mediaIdFor(hash: string, index: number): string {
  return `pdf_${hash.slice(0, 14)}_${index}`;
}

async function buildManifest(options: CliOptions): Promise<PdfMediaManifest> {
  loadProjectEnv();
  requireCommand("pdfimages");

  const manifestPath = path.join(options.outputDir, "manifest.json");
  if (!options.overwrite && (await pathExists(manifestPath))) {
    throw new Error(
      `Manifest already exists at ${manifestPath}. Move it or pass --overwrite to replace it.`,
    );
  }

  if (options.overwrite) {
    await rm(options.outputDir, { recursive: true, force: true });
  }

  const imageDir = path.join(options.outputDir, "images");
  await rm(imageDir, { recursive: true, force: true });
  await mkdir(imageDir, { recursive: true });

  const listResult = await run("pdfimages", ["-list", options.pdfPath]);
  const listedImages = parsePdfImagesList(listResult.stdout);

  await run("pdfimages", ["-png", "-j", options.pdfPath, path.join(imageDir, "image")]);
  const imageFiles = await listExtractedImages(imageDir);
  const pageTexts = await extractPageText(options.pdfPath, options.outputDir);
  const gedcomText = await readGedcom();
  const graph = parseGedcom(gedcomText);
  const people = Object.values(graph.individuals);

  const notes: string[] = [];
  if (!hasCommand("pdftotext")) {
    notes.push("pdftotext was not found, so caption-based matching was skipped.");
  }
  if (listedImages.length === 0) {
    notes.push("No embedded images were reported by pdfimages.");
  }
  if (imageFiles.length === 0) {
    notes.push("No image files were extracted.");
  }

  const images: PdfMediaManifestImage[] = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const fileName = imageFiles[i]!;
    const extractedPath = path.join("images", fileName);
    const absolutePath = path.join(imageDir, fileName);
    const buffer = await readFile(absolutePath);
    const hash = sha256(buffer);
    const listEntry = listedImages[i];
    const sourcePage = listEntry?.page ?? null;
    const captionText = sourcePage ? (pageTexts[sourcePage - 1] ?? "") : "";
    const suggestedPeople = suggestPeople(captionText, people);

    images.push({
      id: mediaIdFor(hash, i + 1),
      sourcePage,
      sourceImageIndex: listEntry?.index ?? i,
      extractedPath,
      fileName,
      sha256: hash,
      byteSize: buffer.byteLength,
      width: listEntry?.width ?? null,
      height: listEntry?.height ?? null,
      captionText,
      legend: captionText,
      suggestedPeople,
      taggedPersonIds: [],
      accepted: false,
    });
  }

  const flattenedPageLikely =
    listedImages.length > 0 &&
    listedImages.length <= pageTexts.length &&
    listedImages.every((entry) => (entry.width ?? 0) > 1000 && (entry.height ?? 0) > 1000);

  if (flattenedPageLikely) {
    notes.push(
      "Extracted images look page-sized; this PDF may be flattened scans that need manual cropping.",
    );
  }

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    sourcePdf: options.pdfPath,
    outputDir: options.outputDir,
    extraction: {
      tool: "poppler",
      embeddedImageCount: listedImages.length,
      extractedImageCount: imageFiles.length,
      flattenedPageLikely,
      notes,
    },
    peopleSnapshot: {
      count: people.length,
    },
    images,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = await buildManifest(options);
  const manifestPath = path.join(options.outputDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Extracted ${manifest.extraction.extractedImageCount} image(s).`);
  console.log(`Embedded images reported by PDF: ${manifest.extraction.embeddedImageCount}.`);
  if (manifest.extraction.flattenedPageLikely) {
    console.log("The extracted images look like full-page scans; manual cropping is likely needed.");
  }
  for (const note of manifest.extraction.notes) {
    console.log(`Note: ${note}`);
  }
  console.log(`Review and edit: ${manifestPath}`);
  console.log("Set accepted=true and taggedPersonIds before running npm run pdf-media:apply.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
