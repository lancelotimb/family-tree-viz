import familyGedcom from "@/data/family-tree.ged";

export {
  parseGedcom,
  splitGivenName,
  treeCardName,
} from "./gedcomParser";

/**
 * Bundled seed document (`data/family-tree.ged`). At runtime the canonical
 * document is loaded from Vercel Blob via {@link readGedcom} in
 * `lib/gedcomStore.ts`; this import bootstraps Blob on first read and supports
 * offline local fallback.
 */
export const FAMILY_GEDCOM = familyGedcom;
