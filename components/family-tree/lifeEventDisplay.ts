import type { LifeEvent } from "./types";

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

/** Format a raw GEDCOM DATE value for display (French). */
export function formatGedcomDate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const abt = trimmed.match(/^ABT\s+(.+)$/i);
  if (abt) return `vers ${formatGedcomDate(abt[1]!)}`;

  const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const monthIndex = Number(dmy[2]) - 1;
    const year = dmy[3]!;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${MONTHS_FR[monthIndex]} ${year}`;
    }
  }

  const my = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (my) {
    const monthIndex = Number(my[1]) - 1;
    const year = my[2]!;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${MONTHS_FR[monthIndex]} ${year}`;
    }
  }

  if (/^\d{4}$/.test(trimmed)) return trimmed;

  return trimmed;
}

/** Display label for a life event date, or null when unknown. */
export function formatLifeEventDate(event: LifeEvent | null | undefined): string | null {
  if (!event) return null;
  if (event.date?.trim()) return formatGedcomDate(event.date);
  if (event.year !== null) return String(event.year);
  return null;
}

type DateParts = {
  year: number;
  month?: number;
  day?: number;
};

function parseLifeEventDateParts(event: LifeEvent | null | undefined): DateParts | null {
  if (!event) return null;

  if (event.date?.trim()) {
    const trimmed = event.date.trim().replace(/^ABT\s+/i, "");
    const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
      return {
        day: Number(dmy[1]),
        month: Number(dmy[2]),
        year: Number(dmy[3]),
      };
    }
    const my = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
    if (my) {
      return { month: Number(my[1]), year: Number(my[2]) };
    }
    const yearOnly = trimmed.match(/^(\d{4})$/);
    if (yearOnly) return { year: Number(yearOnly[1]) };
  }

  if (event.year !== null) return { year: event.year };
  return null;
}

function hasFullDate(parts: DateParts): boolean {
  return parts.day !== undefined && parts.month !== undefined;
}

function ageBetween(birth: DateParts, end: DateParts | Date): number {
  if (end instanceof Date) {
    if (!hasFullDate(birth)) return end.getFullYear() - birth.year;

    let age = end.getFullYear() - birth.year;
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    if (
      endMonth < birth.month! ||
      (endMonth === birth.month && endDay < birth.day!)
    ) {
      age -= 1;
    }
    return Math.max(0, age);
  }

  if (hasFullDate(birth) && hasFullDate(end)) {
    let age = end.year - birth.year;
    if (
      end.month! < birth.month! ||
      (end.month === birth.month && end.day! < birth.day!)
    ) {
      age -= 1;
    }
    return Math.max(0, age);
  }

  return end.year - birth.year;
}

/** Age in full years at death, or current age when still living. */
export function computePersonAge(
  birth: LifeEvent,
  death: LifeEvent | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  const birthParts = parseLifeEventDateParts(birth);
  if (!birthParts) return null;

  if (death && (death.year !== null || death.date?.trim())) {
    const deathParts = parseLifeEventDateParts(death);
    if (!deathParts) return null;
    return ageBetween(birthParts, deathParts);
  }

  return ageBetween(birthParts, referenceDate);
}

export function formatPersonAge(
  birth: LifeEvent,
  death: LifeEvent | null | undefined,
  referenceDate: Date = new Date(),
): string | null {
  const age = computePersonAge(birth, death, referenceDate);
  if (age === null) return null;
  return age === 1 ? "1 an" : `${age} ans`;
}

/** Birth–death year range for compact subtitles. */
export function formatLifeSpanYears(
  birth: LifeEvent,
  death: LifeEvent | null | undefined,
): string {
  const birthYear = birth.year ?? "?";
  const deathYear = death?.year ?? null;
  if (deathYear !== null) return `${birthYear} – ${deathYear}`;
  return `n. ${birthYear}`;
}

/** Birth–death years with age at death or current age. */
export function formatLifeSpanYearsWithAge(
  birth: LifeEvent,
  death: LifeEvent | null | undefined,
  referenceDate: Date = new Date(),
): string {
  const years = formatLifeSpanYears(birth, death);
  const age = formatPersonAge(birth, death, referenceDate);
  if (!age) return years;
  return `${years} · ${age}`;
}

/** Birth–death range with full dates when available. */
export function formatLifeSpan(
  birth: LifeEvent,
  death: LifeEvent | null | undefined,
): string {
  const birthLabel = formatLifeEventDate(birth);
  const deathLabel = formatLifeEventDate(death);

  if (birthLabel && deathLabel) return `${birthLabel} – ${deathLabel}`;
  if (birthLabel) return `n. ${birthLabel}`;
  if (deathLabel) return `† ${deathLabel}`;
  return "Dates inconnues";
}

/** Union marriage line, e.g. "Marié(e) le 5 novembre 1923". */
export function formatMarriageLabel(marriage: LifeEvent | null | undefined): string | null {
  const date = formatLifeEventDate(marriage);
  if (!date) return null;
  return `Marié(e) le ${date}`;
}

export type LifeEventDetail = {
  label: string;
  date: string | null;
  place: string | null;
};

/** Structured birth/death rows for the profile panel. */
export function getLifeEventDetails(
  birth: LifeEvent,
  death: LifeEvent | null | undefined,
): LifeEventDetail[] {
  const rows: LifeEventDetail[] = [
    {
      label: "Naissance",
      date: formatLifeEventDate(birth),
      place: birth.place?.trim() || null,
    },
  ];

  if (death && (formatLifeEventDate(death) || death.place?.trim())) {
    rows.push({
      label: "Décès",
      date: formatLifeEventDate(death),
      place: death.place?.trim() || null,
    });
  }

  return rows.filter((row) => row.date || row.place);
}
