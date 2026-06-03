"use client";

import { Heart, MapPin, Users, X } from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";
import type { MemberGender } from "./types";
import { getChildren, getIndividual, getParents, getSpouses } from "./familyGraph";

type ProfilePanelProps = {
  memberId: string | null;
  open: boolean;
  onClose: () => void;
  onSelectPerson: (id: string) => void;
};

function formatLifespan(birthYear: number | null, deathYear: number | null) {
  const birth = birthYear ?? "?";
  return deathYear ? `${birth} – ${deathYear}` : `b. ${birth}`;
}

export function ProfilePanel({
  memberId,
  open,
  onClose,
  onSelectPerson,
}: ProfilePanelProps) {
  const profile = getIndividual(memberId);
  const parents = profile ? getParents(profile.id) : [];
  const spouses = profile ? getSpouses(profile.id) : [];
  const children = profile ? getChildren(profile.id) : [];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[#3d3428]/20 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[#e8dfd0] bg-[#fffef9] shadow-2xl transition-transform duration-300 ease-out ${
          open && profile ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open || !profile}
      >
        {profile && (
          <>
            <header className="relative shrink-0 border-b border-[#e8dfd0] px-6 pb-5 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full p-2 text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
                aria-label="Close profile"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#e8dfd0] bg-gradient-to-b from-[#faf6ef] to-[#f0e8da]">
                <ProfileAvatar
                  gender={profile.gender}
                  className="h-12 w-12 text-[#a8957a]"
                  strokeWidth={1.25}
                />
              </div>
              <h2 className="mt-4 text-center font-serif text-2xl font-medium text-[#3d3428]">
                {profile.name}
              </h2>
              <p className="mt-1 text-center text-sm text-[#8b7d6b]">
                {formatLifespan(profile.birth.year, profile.death?.year ?? null)}
              </p>
              {profile.birth.place && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-[#6b5f4f]">
                  <MapPin className="h-3.5 w-3.5 text-[#a8957a]" />
                  {profile.birth.place}
                </p>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <section className="mb-8">
                <h3 className="mb-3 font-serif text-lg text-[#3d3428]">Biography</h3>
                <p className="text-sm leading-relaxed text-[#5c5244]">{profile.biography}</p>
              </section>

              <section className="mb-8">
                <h3 className="mb-3 font-serif text-lg text-[#3d3428]">Relationships</h3>
                {parents.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
                      <Users className="h-3.5 w-3.5" />
                      Parents
                    </p>
                    <div className="flex flex-col gap-2">
                      {parents.map((parent) => (
                        <RelationshipCard
                          key={parent.id}
                          id={parent.id}
                          name={parent.name}
                          gender={parent.gender}
                          years={formatLifespan(
                            parent.birth.year,
                            parent.death?.year ?? null,
                          )}
                          onSelect={onSelectPerson}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {spouses.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
                      <Heart className="h-3.5 w-3.5" />
                      {spouses.length > 1 ? "Partners" : "Married with"}
                    </p>
                    <div className="flex flex-col gap-2">
                      {spouses.map((spouse) => (
                        <RelationshipCard
                          key={spouse.id}
                          id={spouse.id}
                          name={spouse.name}
                          gender={spouse.gender}
                          years={formatLifespan(
                            spouse.birth.year,
                            spouse.death?.year ?? null,
                          )}
                          onSelect={onSelectPerson}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {children.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
                      Children
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {children.map((child) => (
                        <RelationshipCard
                          key={child.id}
                          id={child.id}
                          name={child.name}
                          gender={child.gender}
                          years={formatLifespan(
                            child.birth.year,
                            child.death?.year ?? null,
                          )}
                          compact
                          onSelect={onSelectPerson}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 font-serif text-lg text-[#3d3428]">Archival gallery</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {profile.gallery.map((item) => (
                    <figure
                      key={item.id}
                      className="w-36 shrink-0 overflow-hidden rounded-lg border border-[#e8dfd0] bg-[#faf6ef]"
                    >
                      <div className="flex h-28 items-center justify-center bg-gradient-to-br from-[#f0e8da] to-[#e8dfd0]">
                        <ProfileAvatar
                          gender={profile.gender}
                          className="h-8 w-8 text-[#c4b49a]/60"
                          strokeWidth={1}
                        />
                      </div>
                      <figcaption className="px-2 py-2 text-[10px] leading-snug text-[#6b5f4f]">
                        {item.caption}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function RelationshipCard({
  id,
  name,
  gender,
  years,
  compact = false,
  onSelect,
}: {
  id: string;
  name: string;
  gender: MemberGender;
  years: string;
  compact?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`flex cursor-pointer items-center gap-2 rounded-lg border border-[#e8dfd0] bg-white text-left transition-colors hover:border-[#d4c4a8] hover:bg-[#faf6ef] ${
        compact ? "px-2 py-1.5" : "w-full px-3 py-2"
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-[#e8dfd0] bg-[#faf6ef] ${
          compact ? "h-8 w-8" : "h-10 w-10"
        }`}
      >
        <ProfileAvatar
          gender={gender}
          className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-[#a8957a]`}
          strokeWidth={1.25}
        />
      </div>
      <div className="min-w-0">
        <p className={`truncate font-medium text-[#3d3428] ${compact ? "text-xs" : "text-sm"}`}>
          {name}
        </p>
        <p className="text-[10px] text-[#8b7d6b]">{years}</p>
      </div>
    </button>
  );
}
