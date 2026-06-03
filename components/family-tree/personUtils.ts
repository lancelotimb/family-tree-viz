/** Treat people born more than this many years ago as deceased when no death year is recorded. */
export const DECEASED_AGE_THRESHOLD_YEARS = 110;

export function isDeceased(
  birthYear: number | null,
  deathYear: number | null,
  referenceYear = new Date().getFullYear(),
): boolean {
  if (deathYear !== null) return true;
  if (birthYear === null) return false;
  return referenceYear - birthYear > DECEASED_AGE_THRESHOLD_YEARS;
}
