export type PdfMediaPersonSuggestion = {
  personId: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  score: number;
  matchedTerms: string[];
};

export type PdfMediaManifestImage = {
  id: string;
  sourcePage: number | null;
  sourceImageIndex: number;
  extractedPath: string;
  fileName: string;
  sha256: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  captionText: string;
  legend: string;
  suggestedPeople: PdfMediaPersonSuggestion[];
  taggedPersonIds: string[];
  accepted: boolean;
};

export type PdfMediaManifest = {
  version: 1;
  createdAt: string;
  sourcePdf: string;
  outputDir: string;
  extraction: {
    tool: "poppler";
    embeddedImageCount: number;
    extractedImageCount: number;
    flattenedPageLikely: boolean;
    notes: string[];
  };
  peopleSnapshot: {
    count: number;
  };
  images: PdfMediaManifestImage[];
};
