import { loadProjectEnv } from "./loadEnv";
import { seedGedcomBlob } from "../lib/gedcomStore";

loadProjectEnv();

async function main() {
  await seedGedcomBlob();
  console.log("Uploaded data/family-tree.ged to Vercel Blob.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
