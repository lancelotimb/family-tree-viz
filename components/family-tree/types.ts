export type FamilyMemberProfile = {
  id: string;
  name: string;
  birthYear: number;
  deathYear: number | null;
  birthplace: string;
  biography: string;
  avatarUrl: string;
  generation: number;
  spouseId?: string;
  childIds: string[];
  gallery: { id: string; caption: string }[];
};

export type FamilyMemberNodeData = {
  name: string;
  birthYear: number;
  deathYear: number | null;
  generation: number;
  selected?: boolean;
};
