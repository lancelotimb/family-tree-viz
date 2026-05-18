"use client";

import { Heart, MapPin, User, X } from "lucide-react";
import type { FamilyMemberProfile } from "./types";
import { profiles } from "./mockFamilyData";

type ProfilePanelProps = {
  memberId: string | null;
  open: boolean;
  onClose: () => void;
};

function formatLifespan(birthYear: number, deathYear: number | null) {
  return deathYear ? `${birthYear} – ${deathYear}` : `b. ${birthYear}`;
}

function getProfile(id: string | null): FamilyMemberProfile | null {
  if (!id) return null;
  return profiles[id] ?? null;
}

export function ProfilePanel({ memberId, open, onClose }: ProfilePanelProps) {
  const profile = getProfile(memberId);
  const spouse = profile?.spouseId ? profiles[profile.spouseId] : null;
  const children = profile?.childIds.map((id) => profiles[id]).filter(Boolean) ?? [];

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
                <User className="h-12 w-12 text-[#a8957a]" strokeWidth={1.25} />
              </div>
              <h2 className="mt-4 text-center font-serif text-2xl font-medium text-[#3d3428]">
                {profile.name}
              </h2>
              <p className="mt-1 text-center text-sm text-[#8b7d6b]">
                {formatLifespan(profile.birthYear, profile.deathYear)}
              </p>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-[#6b5f4f]">
                <MapPin className="h-3.5 w-3.5 text-[#a8957a]" />
                {profile.birthplace}
              </p>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <section className="mb-8">
                <h3 className="mb-3 font-serif text-lg text-[#3d3428]">Biography</h3>
                <p className="text-sm leading-relaxed text-[#5c5244]">{profile.biography}</p>
              </section>

              <section className="mb-8">
                <h3 className="mb-3 font-serif text-lg text-[#3d3428]">Relationships</h3>
                {spouse && (
                  <div className="mb-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
                      <Heart className="h-3.5 w-3.5" />
                      Married with
                    </p>
                    <RelationshipCard name={spouse.name} years={formatLifespan(spouse.birthYear, spouse.deathYear)} />
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
                          name={child.name}
                          years={formatLifespan(child.birthYear, child.deathYear)}
                          compact
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
                        <User className="h-8 w-8 text-[#c4b49a]/60" strokeWidth={1} />
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
  name,
  years,
  compact = false,
}: {
  name: string;
  years: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-[#e8dfd0] bg-white ${
        compact ? "px-2 py-1.5" : "px-3 py-2"
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-[#e8dfd0] bg-[#faf6ef] ${
          compact ? "h-8 w-8" : "h-10 w-10"
        }`}
      >
        <User
          className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-[#a8957a]`}
        />
      </div>
      <div className="min-w-0">
        <p className={`truncate font-medium text-[#3d3428] ${compact ? "text-xs" : "text-sm"}`}>
          {name}
        </p>
        <p className="text-[10px] text-[#8b7d6b]">{years}</p>
      </div>
    </div>
  );
}
