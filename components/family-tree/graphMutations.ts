import { splitGivenName } from "./gedcomParser";
import type { FamilyGraph, Individual, LifeEvent, MediaItem, MemberGender, Union } from "./types";

export type PersonFormData = {
  firstName: string;
  middleNames: string;
  familyName: string;
  gender: MemberGender;
  birthYear: string;
  birthPlace: string;
  deathYear: string;
  deathPlace: string;
  biography: string;
  famc: string | null;
};

function parseYearInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function buildLifeEvent(yearStr: string, placeStr: string): LifeEvent | null {
  const year = parseYearInput(yearStr);
  const place = placeStr.trim() || undefined;
  if (year === null && !place) return null;
  return { year, place };
}

function buildName(firstName: string, middleNames: string, familyName: string): string {
  const given = middleNames.trim() ? `${firstName.trim()} ${middleNames.trim()}` : firstName.trim();
  return `${given} ${familyName.trim()}`.replace(/\s+/g, " ").trim();
}

export function individualToFormData(individual: Individual): PersonFormData {
  return {
    firstName: individual.firstName,
    middleNames: individual.middleNames,
    familyName: individual.familyName,
    gender: individual.gender,
    birthYear: individual.birth.year?.toString() ?? "",
    birthPlace: individual.birth.place ?? "",
    deathYear: individual.death?.year?.toString() ?? "",
    deathPlace: individual.death?.place ?? "",
    biography: individual.biography,
    famc: individual.famc,
  };
}

export function formDataToIndividual(id: string, data: PersonFormData): Individual {
  const firstName = data.firstName.trim() || "Unknown";
  const familyName = data.familyName.trim().toUpperCase() || "UNKNOWN";
  const middleNames = data.middleNames.trim();
  const birth = buildLifeEvent(data.birthYear, data.birthPlace) ?? { year: null };
  const death = buildLifeEvent(data.deathYear, data.deathPlace);

  return {
    id,
    name: buildName(firstName, middleNames, familyName),
    firstName,
    middleNames,
    familyName,
    gender: data.gender,
    birth,
    death,
    biography: data.biography.trim(),
    avatarUrl: "",
    fams: [],
    famc: data.famc,
    generation: 0,
  };
}

function slugify(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "New";
}

export function generatePersonId(
  graph: FamilyGraph,
  firstName: string,
  familyName: string,
): string {
  const base = `P_${slugify(firstName)}_${slugify(familyName)}`;
  let id = base;
  let counter = 1;
  while (graph.individuals[id]) {
    id = `${base}_${counter}`;
    counter++;
  }
  return id;
}

/** Deep-clone a graph so React state updates stay immutable. */
export function cloneGraph(graph: FamilyGraph): FamilyGraph {
  return {
    individuals: Object.fromEntries(
      Object.entries(graph.individuals).map(([id, person]) => [
        id,
        { ...person, fams: [...person.fams] },
      ]),
    ),
    unions: Object.fromEntries(
      Object.entries(graph.unions).map(([id, union]) => [
        id,
        {
          ...union,
          partnerIds: [...union.partnerIds],
          childIds: [...union.childIds],
        },
      ]),
    ),
    media: Object.fromEntries(
      Object.entries(graph.media).map(([id, item]) => [
        id,
        { ...item, taggedPersonIds: [...item.taggedPersonIds] },
      ]),
    ),
  };
}

export function updatePersonInGraph(
  graph: FamilyGraph,
  personId: string,
  data: PersonFormData,
): FamilyGraph {
  const next = cloneGraph(graph);
  const existing = next.individuals[personId];
  if (!existing) return graph;

  const updated = formDataToIndividual(personId, data);
  updated.fams = [...existing.fams];
  updated.avatarUrl = existing.avatarUrl;
  updated.famc = data.famc;

  if (existing.famc && existing.famc !== data.famc) {
    const oldUnion = next.unions[existing.famc];
    if (oldUnion) {
      oldUnion.childIds = oldUnion.childIds.filter((id) => id !== personId);
    }
  }

  if (data.famc) {
    const birthUnion = next.unions[data.famc];
    if (birthUnion && !birthUnion.childIds.includes(personId)) {
      birthUnion.childIds.push(personId);
    }
  }

  next.individuals[personId] = updated;
  return next;
}

export function addPersonToGraph(
  graph: FamilyGraph,
  data: PersonFormData,
): { graph: FamilyGraph; personId: string } {
  const next = cloneGraph(graph);
  const personId = generatePersonId(next, data.firstName, data.familyName);
  const person = formDataToIndividual(personId, data);

  if (data.famc) {
    const birthUnion = next.unions[data.famc];
    if (birthUnion) {
      birthUnion.childIds.push(personId);
    }
  }

  next.individuals[personId] = person;
  return { graph: next, personId };
}

export type UnionFormData = {
  partner1Id: string;
  partner2Id: string;
  marriageYear: string;
  marriagePlace: string;
  divorceYear: string;
  divorcePlace: string;
  childIds: string[];
  /** Which partner each child's birth line follows when the union splits. */
  childFollowParent: Record<string, string>;
};

export type RemoveUnionFormData = {
  childFollowParent: Record<string, string>;
};

export type AddMarriageFormData = {
  partner1Id: string;
  partner2Id: string;
  marriageYear: string;
  marriagePlace: string;
};

export function lifeEventToForm(event: LifeEvent | null): { year: string; place: string } {
  return {
    year: event?.year?.toString() ?? "",
    place: event?.place ?? "",
  };
}

export function unionToFormData(union: Union): UnionFormData {
  const marriage = lifeEventToForm(union.marriage);
  const divorce = lifeEventToForm(union.divorce);
  const defaultParent = union.partnerIds[0] ?? "";
  const childFollowParent: Record<string, string> = {};
  for (const childId of union.childIds) {
    childFollowParent[childId] = defaultParent;
  }
  return {
    partner1Id: union.partnerIds[0] ?? "",
    partner2Id: union.partnerIds[1] ?? "",
    marriageYear: marriage.year,
    marriagePlace: marriage.place,
    divorceYear: divorce.year,
    divorcePlace: divorce.place,
    childIds: [...union.childIds],
    childFollowParent,
  };
}

export function generateUnionId(
  graph: FamilyGraph,
  partner1: Individual,
  partner2: Individual,
): string {
  const base = `F_${slugify(partner1.familyName)}_${slugify(partner1.firstName)}_${slugify(partner2.firstName)}`;
  let id = base;
  let counter = 1;
  while (graph.unions[id]) {
    id = `${base}_${counter}`;
    counter++;
  }
  return id;
}

function findUnionBetween(graph: FamilyGraph, personId1: string, personId2: string): string | null {
  const person = graph.individuals[personId1];
  if (!person) return null;
  for (const unionId of person.fams) {
    const union = graph.unions[unionId];
    if (union?.partnerIds.includes(personId2)) return unionId;
  }
  return null;
}

function syncUnionChildren(next: FamilyGraph, unionId: string, childIds: string[]): void {
  const union = next.unions[unionId];
  if (!union) return;

  const previous = new Set(union.childIds);
  const nextIds = new Set(childIds);

  for (const childId of previous) {
    if (nextIds.has(childId)) continue;
    const child = next.individuals[childId];
    if (child?.famc === unionId) {
      child.famc = null;
    }
  }

  for (const childId of nextIds) {
    const child = next.individuals[childId];
    if (!child) continue;
    if (child.famc && child.famc !== unionId) {
      const oldUnion = next.unions[child.famc];
      if (oldUnion) {
        oldUnion.childIds = oldUnion.childIds.filter((id) => id !== childId);
      }
    }
    child.famc = unionId;
  }

  union.childIds = [...childIds];
}

function unlinkPartnerFromUnion(next: FamilyGraph, unionId: string, partnerId: string): void {
  const person = next.individuals[partnerId];
  if (person) {
    person.fams = person.fams.filter((id) => id !== unionId);
  }
}

function findSingleParentUnion(graph: FamilyGraph, parentId: string): string | null {
  const person = graph.individuals[parentId];
  if (!person) return null;
  for (const unionId of person.fams) {
    const union = graph.unions[unionId];
    if (union?.partnerIds.length === 1 && union.partnerIds[0] === parentId) {
      return unionId;
    }
  }
  return null;
}

function generateSingleParentUnionId(graph: FamilyGraph, parent: Individual): string {
  const base = `F_${slugify(parent.familyName)}_${slugify(parent.firstName)}_solo`;
  let id = base;
  let counter = 1;
  while (graph.unions[id]) {
    id = `${base}_${counter}`;
    counter++;
  }
  return id;
}

function findOrCreateSingleParentUnion(next: FamilyGraph, parentId: string): string {
  const existing = findSingleParentUnion(next, parentId);
  if (existing) return existing;

  const parent = next.individuals[parentId];
  if (!parent) return parentId;

  const unionId = generateSingleParentUnionId(next, parent);
  next.unions[unionId] = {
    id: unionId,
    partnerIds: [parentId],
    childIds: [],
    marriage: null,
    divorce: null,
    generation: 0,
  };
  linkPartnerToUnion(next, unionId, parentId);
  return unionId;
}

function reassignChildToParent(
  next: FamilyGraph,
  childId: string,
  parentId: string,
  removeFromUnionId: string,
): void {
  const child = next.individuals[childId];
  if (!child) return;

  const sourceUnion = next.unions[removeFromUnionId];
  if (sourceUnion) {
    sourceUnion.childIds = sourceUnion.childIds.filter((id) => id !== childId);
  }

  const soloUnionId = findOrCreateSingleParentUnion(next, parentId);
  child.famc = soloUnionId;
  const soloUnion = next.unions[soloUnionId];
  if (!soloUnion.childIds.includes(childId)) {
    soloUnion.childIds.push(childId);
  }
}

function childName(graph: FamilyGraph, childId: string): string {
  return graph.individuals[childId]?.name ?? "this child";
}

function validateChildCustody(
  graph: FamilyGraph,
  childIds: string[],
  validParents: string[],
  childFollowParent: Record<string, string>,
): string | null {
  for (const childId of childIds) {
    const follow = childFollowParent[childId];
    if (!follow || !validParents.includes(follow)) {
      return `Choose which parent ${childName(graph, childId)} follows.`;
    }
  }
  return null;
}

function applyChildCustodyOnSplit(
  next: FamilyGraph,
  unionId: string,
  childIds: string[],
  removedParents: string[],
  childFollowParent: Record<string, string>,
): void {
  for (const childId of childIds) {
    const follow = childFollowParent[childId];
    if (follow && removedParents.includes(follow)) {
      reassignChildToParent(next, childId, follow, unionId);
    }
  }
}

function linkPartnerToUnion(next: FamilyGraph, unionId: string, partnerId: string): void {
  const person = next.individuals[partnerId];
  if (!person || person.fams.includes(unionId)) return;
  person.fams.push(unionId);
}

export function updateUnionInGraph(
  graph: FamilyGraph,
  unionId: string,
  data: UnionFormData,
): FamilyGraph | { error: string } {
  const next = cloneGraph(graph);
  const union = next.unions[unionId];
  if (!union) return graph;

  const oldPartners = [...union.partnerIds];
  const newPartners = [data.partner1Id.trim(), data.partner2Id.trim()].filter(Boolean);

  if (newPartners.length === 0) {
    return { error: "A union needs at least one partner." };
  }
  if (data.partner1Id.trim() && data.partner2Id.trim() && data.partner1Id === data.partner2Id) {
    return { error: "Partners must be different people." };
  }

  for (const partnerId of newPartners) {
    if (!next.individuals[partnerId]) {
      return { error: "One or both partners could not be found." };
    }
  }

  if (newPartners.length === 2) {
    const existing = findUnionBetween(next, newPartners[0], newPartners[1]);
    if (existing && existing !== unionId) {
      return { error: "These partners are already linked in another union." };
    }
  }

  const removedParents = oldPartners.filter((id) => !newPartners.includes(id));
  const addedParents = newPartners.filter((id) => !oldPartners.includes(id));

  let childIdsForUnion = [...data.childIds];

  if (removedParents.length > 0) {
    const childrenNeedingCustody = [...new Set([...union.childIds, ...data.childIds])];
    if (childrenNeedingCustody.length > 0) {
      const custodyError = validateChildCustody(
        next,
        childrenNeedingCustody,
        oldPartners,
        data.childFollowParent,
      );
      if (custodyError) return { error: custodyError };

      applyChildCustodyOnSplit(
        next,
        unionId,
        childrenNeedingCustody,
        removedParents,
        data.childFollowParent,
      );
    }

    childIdsForUnion = data.childIds.filter((childId) => {
      const follow = data.childFollowParent[childId] ?? newPartners[0];
      return newPartners.includes(follow);
    });
  }

  for (const removed of removedParents) {
    unlinkPartnerFromUnion(next, unionId, removed);
  }
  union.partnerIds = newPartners;
  for (const added of addedParents) {
    linkPartnerToUnion(next, unionId, added);
  }

  union.marriage = buildLifeEvent(data.marriageYear, data.marriagePlace);
  union.divorce = buildLifeEvent(data.divorceYear, data.divorcePlace);
  syncUnionChildren(next, unionId, childIdsForUnion);
  return next;
}

export function removeUnionFromGraph(
  graph: FamilyGraph,
  unionId: string,
  data: RemoveUnionFormData,
): FamilyGraph | { error: string } {
  const next = cloneGraph(graph);
  const union = next.unions[unionId];
  if (!union) return graph;

  const partners = [...union.partnerIds];
  if (partners.length === 0) {
    delete next.unions[unionId];
    return next;
  }

  if (union.childIds.length > 0) {
    const custodyError = validateChildCustody(
      next,
      union.childIds,
      partners,
      data.childFollowParent,
    );
    if (custodyError) return { error: custodyError };

    for (const childId of union.childIds) {
      const follow = data.childFollowParent[childId]!;
      reassignChildToParent(next, childId, follow, unionId);
    }
  }

  for (const partnerId of partners) {
    unlinkPartnerFromUnion(next, unionId, partnerId);
  }

  delete next.unions[unionId];
  return next;
}

export function addMarriageToGraph(
  graph: FamilyGraph,
  data: AddMarriageFormData,
): { graph: FamilyGraph; unionId: string } | { error: string } {
  const partner1Id = data.partner1Id.trim();
  const partner2Id = data.partner2Id.trim();
  if (!partner1Id || !partner2Id) {
    return { error: "Both partners are required." };
  }
  if (partner1Id === partner2Id) {
    return { error: "Choose two different people." };
  }

  const next = cloneGraph(graph);
  const partner1 = next.individuals[partner1Id];
  const partner2 = next.individuals[partner2Id];
  if (!partner1 || !partner2) {
    return { error: "One or both partners could not be found." };
  }

  const existingUnionId = findUnionBetween(next, partner1Id, partner2Id);
  if (existingUnionId) {
    return { error: "These partners are already linked in a union." };
  }

  const unionId = generateUnionId(next, partner1, partner2);
  next.unions[unionId] = {
    id: unionId,
    partnerIds: [partner1Id, partner2Id],
    childIds: [],
    marriage: buildLifeEvent(data.marriageYear, data.marriagePlace),
    divorce: null,
    generation: 0,
  };

  linkPartnerToUnion(next, unionId, partner1Id);
  linkPartnerToUnion(next, unionId, partner2Id);

  return { graph: next, unionId };
}

/** Recompute display name fields from a raw given-name edit. */
export function normalizeNameFields(firstName: string, middleNames: string, familyName: string) {
  const { firstName: parsedFirst, middleNames: parsedMiddle } = splitGivenName(firstName);
  return {
    firstName: parsedFirst || firstName.trim() || "Unknown",
    middleNames: middleNames.trim() || parsedMiddle,
    familyName: familyName.trim().toUpperCase() || "UNKNOWN",
  };
}

export type MediaFormData = {
  url: string;
  legend: string;
  taggedPersonIds: string[];
};

export function generateMediaId(graph: FamilyGraph): string {
  let counter = 1;
  let id = `M_photo_${counter}`;
  while (graph.media[id]) {
    counter++;
    id = `M_photo_${counter}`;
  }
  return id;
}

export function updatePersonAvatarInGraph(
  graph: FamilyGraph,
  personId: string,
  avatarUrl: string,
): FamilyGraph {
  const next = cloneGraph(graph);
  const person = next.individuals[personId];
  if (!person) return graph;
  person.avatarUrl = avatarUrl;
  return next;
}

export function addMediaToGraph(
  graph: FamilyGraph,
  mediaId: string,
  data: MediaFormData,
): FamilyGraph {
  const next = cloneGraph(graph);
  next.media[mediaId] = {
    id: mediaId,
    url: data.url.trim(),
    legend: data.legend,
    taggedPersonIds: [...new Set(data.taggedPersonIds)],
  };
  return next;
}

export function updateMediaInGraph(
  graph: FamilyGraph,
  mediaId: string,
  data: Partial<MediaFormData>,
): FamilyGraph {
  const next = cloneGraph(graph);
  const existing = next.media[mediaId];
  if (!existing) return graph;
  if (data.url !== undefined) existing.url = data.url.trim();
  if (data.legend !== undefined) existing.legend = data.legend;
  if (data.taggedPersonIds !== undefined) {
    existing.taggedPersonIds = [...new Set(data.taggedPersonIds)];
  }
  return next;
}

export function removeMediaFromGraph(graph: FamilyGraph, mediaId: string): FamilyGraph {
  const next = cloneGraph(graph);
  delete next.media[mediaId];
  return next;
}
