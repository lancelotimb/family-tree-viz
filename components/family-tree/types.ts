export type MemberGender = "male" | "female";

export type FamilyMemberProfile = {
  id: string;
  name: string;
  birthYear: number;
  deathYear: number | null;
  birthplace: string;
  biography: string;
  avatarUrl: string;
  gender: MemberGender;
  generation: number;
  spouseId?: string;
  childIds: string[];
  gallery: { id: string; caption: string }[];
};

export type FamilyMemberNodeData = {
  name: string;
  birthYear: number;
  deathYear: number | null;
  gender: MemberGender;
  generation: number;
  selected?: boolean;
  greyed?: boolean;
  pathHighlighted?: boolean;
};

export type FamilyEdgeData = {
  parentA: string;
  parentB: string | null;
};
