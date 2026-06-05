import type { Individual } from "./types";

/** True when the person has been born on or before the given year. */
export function isBornByYear(birthYear: number | null, year: number): boolean {
  if (birthYear === null) return true;
  return birthYear <= year;
}

export function getFamilyTimeRange(
  individuals: Record<string, Individual>,
): { minYear: number; maxYear: number } {
  const currentYear = new Date().getFullYear();
  let minYear = currentYear;
  let maxYear = currentYear;
  let allHaveDeath = true;
  let hasBirth = false;

  for (const person of Object.values(individuals)) {
    if (person.birth.year !== null) {
      hasBirth = true;
      minYear = Math.min(minYear, person.birth.year);
    }
    if (person.death?.year != null) {
      maxYear = Math.max(maxYear, person.death.year);
    } else {
      allHaveDeath = false;
    }
  }

  if (!hasBirth) {
    minYear = currentYear - 100;
  }

  if (!allHaveDeath) {
    maxYear = Math.max(maxYear, currentYear);
  }

  return { minYear, maxYear };
}
