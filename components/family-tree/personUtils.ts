/**
 * Treat people born more than this many years ago as deceased when no death year
 * is recorded. People with no birth year are also treated as deceased.
 */
export const DECEASED_AGE_THRESHOLD_YEARS = 110;

export function isDeceased(
  birthYear: number | null,
  deathYear: number | null,
  referenceYear = new Date().getFullYear(),
): boolean {
  if (deathYear !== null) return true;
  if (birthYear === null) return true;
  return referenceYear - birthYear > DECEASED_AGE_THRESHOLD_YEARS;
}
