"use client";

import { useEffect, useState } from "react";
import { Heart, MapPin, Pencil, Plus, Users, X, type LucideIcon } from "lucide-react";
import { AvatarCropDialog } from "./AvatarCropDialog";
import { ProfileAvatar } from "./ProfileAvatar";
import type { LifeEvent, MemberGender } from "./types";
import {
  getChildren,
  getIndividual,
  getParents,
  getPersonGallery,
  getPersonUnions,
  getUnionPartners,
} from "./familyGraph";
import { useFamilyGraphAdmin } from "./FamilyGraphContext";
import { EditPersonForm } from "./PersonForm";
import { useGraphRevision } from "./useGraphRevision";
import {
  formatLifeSpanYears,
  formatLifeEventDate,
  formatMarriageLabel,
} from "./lifeEventDisplay";

type ProfilePanelProps = {
  memberId: string | null;
  open: boolean;
  onClose: () => void;
  onSelectPerson: (id: string) => void;
  focusPersonId: string;
  onFocusLineage: (id: string) => void;
  onEditUnion?: (unionId: string) => void;
  onAddMarriage?: (personId: string) => void;
};

function formatRelationYears(birthYear: number | null, deathYear: number | null) {
  const birth = birthYear ?? "?";
  return deathYear ? `${birth} – ${deathYear}` : `n. ${birth}`;
}

export function ProfilePanel({
  memberId,
  open,
  onClose,
  onSelectPerson,
  focusPersonId,
  onFocusLineage,
  onEditUnion,
  onAddMarriage,
}: ProfilePanelProps) {
  const graphRevision = useGraphRevision();
  const { adminMode, updatePerson, updateAvatar, saving, saveError } = useFamilyGraphAdmin();
  const [editing, setEditing] = useState(false);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; legend: string } | null>(
    null,
  );
  const profile = getIndividual(memberId);
  const parents = profile ? getParents(profile.id) : [];
  const personUnions = profile ? getPersonUnions(profile.id) : [];
  const children = profile ? getChildren(profile.id) : [];
  const gallery = profile ? getPersonGallery(profile.id) : [];

  void graphRevision;

  const handleClose = () => {
    setEditing(false);
    setAvatarCropOpen(false);
    setFullscreenImage(null);
    onClose();
  };

  useEffect(() => {
    if (!fullscreenImage) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreenImage(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenImage]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[#3d3428]/20 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={handleClose}
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
                onClick={handleClose}
                className="absolute right-4 top-4 rounded-full p-2 text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
                aria-label="Fermer le profil"
              >
                <X className="h-5 w-5" />
              </button>

              {editing ? (
                <div className="pt-2">
                  <h2 className="mb-4 font-serif text-xl text-[#3d3428]">
                    Modifier la personne
                  </h2>
                  <EditPersonForm
                    person={profile}
                    onCancel={() => setEditing(false)}
                    onSubmit={async (data) => {
                      const ok = await updatePerson(profile.id, data);
                      if (ok) setEditing(false);
                      return ok;
                    }}
                  />
                  {saveError ? (
                    <p className="mt-3 text-sm text-red-700">{saveError}</p>
                  ) : null}
                </div>
              ) : (
                <>
                  {adminMode ? (
                    <button
                      type="button"
                      onClick={() => setAvatarCropOpen(true)}
                      className="group relative mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-[#e8dfd0] bg-gradient-to-b from-[#faf6ef] to-[#f0e8da]"
                      aria-label="Changer l'avatar"
                    >
                      <ProfileAvatar
                        gender={profile.gender}
                        src={profile.avatarUrl || undefined}
                        alt={profile.name}
                        className="h-full w-full text-[#a8957a]"
                        strokeWidth={1.25}
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-[#3d3428]/0 text-xs font-medium text-white opacity-0 transition group-hover:bg-[#3d3428]/45 group-hover:opacity-100">
                        Changer
                      </span>
                    </button>
                  ) : (
                    <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-[#e8dfd0] bg-gradient-to-b from-[#faf6ef] to-[#f0e8da]">
                      <ProfileAvatar
                        gender={profile.gender}
                        src={profile.avatarUrl || undefined}
                        alt={profile.name}
                        className="h-full w-full text-[#a8957a]"
                        strokeWidth={1.25}
                      />
                    </div>
                  )}
                  <h2 className="mt-4 text-center font-serif text-2xl font-medium text-[#3d3428]">
                    <span>
                      {profile.middleNames.trim()
                        ? `${profile.firstName} ${profile.middleNames}`
                        : profile.firstName}
                    </span>{" "}
                    <span className="uppercase tracking-wide">{profile.familyName}</span>
                  </h2>
                  <p className="mt-1 text-center text-sm text-[#8b7d6b]">
                    {formatLifeSpanYears(profile.birth, profile.death)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 items-stretch gap-2">
                    <LifeEventBox label="Naissance" event={profile.birth} />
                    <LifeEventBox label="Décès" event={profile.death} />
                  </div>
                  <div className="mt-4 flex justify-center gap-2">
                    <ProfileActionButton
                      icon={Users}
                      label={
                        focusPersonId === profile.id ? "Lignée ciblée" : "Cibler la lignée"
                      }
                      active={focusPersonId === profile.id}
                      onClick={() => onFocusLineage(profile.id)}
                    />
                    {adminMode ? (
                      <ProfileActionButton
                        icon={Pencil}
                        label={saving ? "Enregistrement..." : "Modifier"}
                        active={false}
                        onClick={() => setEditing(true)}
                        disabled={saving}
                      />
                    ) : null}
                  </div>
                </>
              )}
            </header>

            {!editing ? (
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <section className="mb-8">
                  <h3 className="mb-3 font-serif text-lg text-[#3d3428]">Biographie</h3>
                  <p className="text-sm leading-relaxed text-[#5c5244]">{profile.biography}</p>
                </section>

                <section className="mb-8">
                  <h3 className="mb-3 font-serif text-lg text-[#3d3428]">Relations</h3>
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
                            years={formatRelationYears(
                              parent.birth.year,
                              parent.death?.year ?? null,
                            )}
                            onSelect={onSelectPerson}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {personUnions.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
                        <Heart className="h-3.5 w-3.5" />
                        {personUnions.length > 1 ? "Unions" : "Marié(e) avec"}
                      </p>
                      <div className="flex flex-col gap-2">
                        {personUnions.map((union) => {
                          const partners = getUnionPartners(profile.id, union.id);
                          const marriageLabel = formatMarriageLabel(union.marriage);
                          const marriagePlace = union.marriage?.place?.trim();
                          const meta = [
                            marriageLabel,
                            marriagePlace ?? null,
                            union.divorce ? "Divorcé(e)" : null,
                            union.childIds.length === 1
                              ? "1 enfant"
                              : `${union.childIds.length} enfants`,
                          ]
                            .filter(Boolean)
                            .join(" · ");

                          return (
                            <div
                              key={union.id}
                              className="rounded-lg border border-[#e8dfd0] bg-white p-2"
                            >
                              {partners.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                  {partners.map((partner) => (
                                    <RelationshipCard
                                      key={partner.id}
                                      id={partner.id}
                                      name={partner.name}
                                      gender={partner.gender}
                                      years={formatRelationYears(
                                        partner.birth.year,
                                        partner.death?.year ?? null,
                                      )}
                                      onSelect={onSelectPerson}
                                    />
                                  ))}
                                </div>
                              ) : null}
                              {meta || (adminMode && onEditUnion) ? (
                                <div
                                  className={`flex items-center justify-between gap-2 ${
                                    partners.length > 0
                                      ? "mt-2 border-t border-[#f0e8da] pt-2"
                                      : "px-1 py-1"
                                  }`}
                                >
                                  {meta ? (
                                    <p className="text-[10px] text-[#8b7d6b]">{meta}</p>
                                  ) : (
                                    <span />
                                  )}
                                  {adminMode && onEditUnion ? (
                                    <button
                                      type="button"
                                      onClick={() => onEditUnion(union.id)}
                                      className="shrink-0 rounded-lg border border-[#e8dfd0] px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[#6b5f4f] transition-colors hover:bg-[#faf6ef]"
                                    >
                                      Modifier
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {adminMode && onAddMarriage ? (
                    <button
                      type="button"
                      onClick={() => onAddMarriage(profile.id)}
                      className="mb-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-[#c9b896] px-3 py-2 text-sm font-medium text-[#6b5f4f] transition-colors hover:bg-[#faf6ef]"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter un mariage
                    </button>
                  ) : null}
                  {children.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
                        Enfants
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {children.map((child) => (
                          <RelationshipCard
                            key={child.id}
                            id={child.id}
                            name={child.name}
                            gender={child.gender}
                            years={formatRelationYears(
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
                  {gallery.length > 0 ? (
                    <>
                      <h3 className="mb-3 font-serif text-lg text-[#3d3428]">
                        Galerie d&apos;archives
                      </h3>
                      <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
                        {gallery.map((item) => (
                          <figure
                            key={item.id}
                            className="w-full shrink-0 overflow-hidden rounded-lg border border-[#e8dfd0] bg-[#faf6ef]"
                          >
                            {item.url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setFullscreenImage({ url: item.url, legend: item.legend })
                                }
                                className="block w-full cursor-zoom-in text-left"
                                aria-label={`Ouvrir l'image d'archive de ${profile.name} en plein écran`}
                              >
                                <img
                                  src={item.url}
                                  alt=""
                                  className="block h-auto w-full"
                                />
                              </button>
                            ) : (
                              <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-[#f0e8da] to-[#e8dfd0]">
                                <ProfileAvatar
                                  gender={profile.gender}
                                  className="h-8 w-8 text-[#c4b49a]/60"
                                  strokeWidth={1}
                                />
                              </div>
                            )}
                            {item.legend.trim() ? (
                              <figcaption className="whitespace-pre-line px-2 py-2 text-[10px] leading-snug text-[#6b5f4f]">
                                {item.legend}
                              </figcaption>
                            ) : null}
                          </figure>
                        ))}
                      </div>
                    </>
                  ) : null}
                </section>
              </div>
            ) : null}
          </>
        )}
      </aside>

      {profile && adminMode ? (
        <AvatarCropDialog
          open={avatarCropOpen}
          personId={profile.id}
          onClose={() => setAvatarCropOpen(false)}
          onUploaded={(url) => updateAvatar(profile.id, url)}
        />
      ) : null}

      {fullscreenImage ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1f1a14]/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image d'archive en plein écran"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-[#3d3428] shadow-lg transition-colors hover:bg-white"
            aria-label="Fermer l'image en plein écran"
          >
            <X className="h-5 w-5" />
          </button>
          <figure
            className="flex max-h-full max-w-6xl flex-col items-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={fullscreenImage.url}
              alt=""
              className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            {fullscreenImage.legend.trim() ? (
              <figcaption className="max-w-3xl whitespace-pre-line rounded-lg bg-[#fffef9]/95 px-4 py-3 text-sm leading-relaxed text-[#3d3428] shadow-lg">
                {fullscreenImage.legend}
              </figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}
    </>
  );
}

function LifeEventBox({ label, event }: { label: string; event: LifeEvent | null }) {
  const date = event ? formatLifeEventDate(event) : null;
  const place = event?.place?.trim() || null;
  const hasContent = Boolean(date || place);

  return (
    <div className="flex h-full min-h-[4.5rem] flex-col rounded-lg border border-[#e8dfd0] bg-white px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[#a8957a]">
        {label}
      </p>
      {hasContent ? (
        <>
          {date ? (
            <p className="mt-1 text-sm leading-snug text-[#3d3428]">{date}</p>
          ) : null}
          {place ? (
            <p className="mt-1 flex items-start gap-1 text-xs leading-snug text-[#6b5f4f]">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#a8957a]" aria-hidden />
              <span>{place}</span>
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-1 text-sm text-[#c4b49a]">—</p>
      )}
    </div>
  );
}

function ProfileActionButton({
  icon: Icon,
  label,
  active,
  onClick,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? "border-[#6b7d5a] bg-[#eef4e8] text-[#4a5c3d]"
          : "border-[#e8dfd0] bg-white text-[#3d3428] hover:border-[#d4c4a8] hover:bg-[#faf6ef]"
      }`}
      aria-pressed={active}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </button>
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
          className={`${compact ? "h-4.5 w-4.5" : "h-5 w-5"} text-[#a8957a]`}
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
