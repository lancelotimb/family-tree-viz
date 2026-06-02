import type { BranchColor } from "./branchPalette";

export type MemberGender = "male" | "female";

/** A dated, optionally-placed life event (GEDCOM BIRT / DEAT / MARR …). */
export type LifeEvent = {
  /** Parsed four-digit year, or null when the GEDCOM date is absent/unparseable. */
  year: number | null;
  place?: string;
};

/**
 * GEDCOM `INDI` record. People reference the unions they belong to instead of
 * carrying a single `spouseId`, which is what lets us model remarriages and
 * half-siblings.
 */
export type Individual = {
  id: string;
  name: string;
  familyName: string;
  gender: MemberGender;
  birth: LifeEvent;
  death: LifeEvent | null;
  biography: string;
  avatarUrl: string;
  gallery: { id: string; caption: string }[];
  /** Unions where this person is a partner (GEDCOM `FAMS`). */
  fams: string[];
  /** Union this person was born into (GEDCOM `FAMC`). */
  famc: string | null;
  /** Derived layer index used for layout. */
  generation: number;
};

/**
 * GEDCOM `FAM` record — the "marriage / union node". It owns the relationship
 * between two partners and their shared children.
 */
export type Union = {
  id: string;
  /** GEDCOM `HUSB` + `WIFE`; one entry for single-parent unions. */
  partnerIds: string[];
  /** GEDCOM `CHIL`, sorted by birth year. */
  childIds: string[];
  marriage: LifeEvent | null;
  divorce: LifeEvent | null;
  /** Derived layer index (matches the partners' generation). */
  generation: number;
};

export type FamilyGraph = {
  individuals: Record<string, Individual>;
  unions: Record<string, Union>;
};

export type PersonNodeData = {
  kind: "person";
  name: string;
  familyName: string;
  branchColor: BranchColor;
  birthYear: number | null;
  deathYear: number | null;
  gender: MemberGender;
  generation: number;
  selected?: boolean;
  greyed?: boolean;
  pathHighlighted?: boolean;
  colorByFamily?: boolean;
};

export type UnionNodeData = {
  kind: "union";
  familyName: string;
  branchColor: BranchColor;
  marriageYear: number | null;
  divorced: boolean;
  singleParent: boolean;
  pathHighlighted?: boolean;
  colorByFamily?: boolean;
};

export type FamilyNodeData = PersonNodeData | UnionNodeData;
