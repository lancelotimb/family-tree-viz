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
