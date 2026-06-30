"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { getIndividual } from "./familyGraph";
import { PersonSearchInput } from "./PersonSearchInput";
import type { RemoveUnionFormData, UnionFormData } from "./graphMutations";
import { unionToFormData } from "./graphMutations";
import type { Union } from "./types";
import { useGraphRevision } from "./useGraphRevision";

type UnionFormProps = {
  union: Union;
  onSubmit: (data: UnionFormData) => Promise<{ ok: boolean; error?: string }>;
  onRemove?: (data: RemoveUnionFormData) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
  submitLabel: string;
};

function formatLifespan(birthYear: number | null, deathYear: number | null) {
  const birth = birthYear ?? "?";
  return deathYear ? `${birth} – ${deathYear}` : `n. ${birth}`;
}

export function UnionForm({ union, onSubmit, onRemove, onCancel, submitLabel }: UnionFormProps) {
  const graphRevision = useGraphRevision();
  const [form, setForm] = useState<UnionFormData>(() => unionToFormData(union));
  const [childToAdd, setChildToAdd] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  void graphRevision;

  useEffect(() => {
    setForm(unionToFormData(union));
    setChildToAdd("");
    setShowRemoveConfirm(false);
    setError(null);
  }, [union]);

  const initialPartners = useMemo(() => union.partnerIds, [union]);
  const formPartners = useMemo(
    () => [form.partner1Id, form.partner2Id].filter(Boolean),
    [form.partner1Id, form.partner2Id],
  );
  const removedPartners = useMemo(
    () => initialPartners.filter((id) => !formPartners.includes(id)),
    [initialPartners, formPartners],
  );

  const children = useMemo(
    () =>
      form.childIds
        .map((id) => getIndividual(id))
        .filter((child): child is NonNullable<typeof child> => child !== null),
    [form.childIds, graphRevision],
  );

  const custodyParents = showRemoveConfirm
    ? initialPartners
    : removedPartners.length > 0
      ? initialPartners
      : formPartners.length >= 2
        ? formPartners
        : [];

  const showCustodyPickers =
    form.childIds.length > 0 &&
    custodyParents.length >= 2 &&
    (showRemoveConfirm || removedPartners.length > 0);

  const excludeFromChildSearch = useMemo(() => {
    const ids = new Set(form.childIds);
    for (const partnerId of formPartners) ids.add(partnerId);
    return ids;
  }, [form.childIds, formPartners]);

  const updateField = <K extends keyof UnionFormData>(key: K, value: UnionFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setChildFollowParent = (childId: string, parentId: string) => {
    setForm((current) => ({
      ...current,
      childFollowParent: { ...current.childFollowParent, [childId]: parentId },
    }));
  };

  const addChild = () => {
    const childId = childToAdd.trim();
    if (!childId || form.childIds.includes(childId) || excludeFromChildSearch.has(childId)) {
      return;
    }
    const defaultParent = form.partner1Id || custodyParents[0] || "";
    updateField("childIds", [...form.childIds, childId]);
    if (defaultParent) {
      setChildFollowParent(childId, defaultParent);
    }
    setChildToAdd("");
  };

  const removeChild = (childId: string) => {
    setForm((current) => {
      const nextFollow = { ...current.childFollowParent };
      delete nextFollow[childId];
      return {
        ...current,
        childIds: current.childIds.filter((id) => id !== childId),
        childFollowParent: nextFollow,
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await onSubmit(form);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Impossible d'enregistrer les changements dans le fichier GEDCOM.");
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setRemoving(true);
    setError(null);
    const result = await onRemove({ childFollowParent: form.childFollowParent });
    setRemoving(false);
    if (!result.ok) {
      setError(result.error ?? "Impossible de supprimer cette union.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PersonSearchInput
        label="Partenaire 1"
        value={form.partner1Id}
        onChange={(id) => updateField("partner1Id", id)}
        excludeId={form.partner2Id}
        placeholder="Rechercher une personne..."
      />
      <PersonSearchInput
        label="Partenaire 2 (facultatif)"
        value={form.partner2Id}
        onChange={(id) => updateField("partner2Id", id)}
        excludeId={form.partner1Id}
        placeholder="Laisser vide pour une union monoparentale"
      />

      {removedPartners.length > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Un partenaire a été retiré. Choisissez ci-dessous la ligne de naissance parentale
          que chaque enfant doit suivre avant d&apos;enregistrer.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Année du mariage">
          <input
            value={form.marriageYear}
            onChange={(e) => updateField("marriageYear", e.target.value)}
            className={inputClass}
            placeholder="ex. 1952"
          />
        </Field>
        <Field label="Année du divorce">
          <input
            value={form.divorceYear}
            onChange={(e) => updateField("divorceYear", e.target.value)}
            className={inputClass}
            placeholder="Laisser vide si non divorcé(e)"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Lieu du mariage">
          <input
            value={form.marriagePlace}
            onChange={(e) => updateField("marriagePlace", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Lieu du divorce">
          <input
            value={form.divorcePlace}
            onChange={(e) => updateField("divorcePlace", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div>
        <Field label="Enfants">
          {children.length > 0 ? (
            <ul className="mb-3 space-y-2">
              {children.map((child) => (
                <li
                  key={child.id}
                  className="rounded-lg border border-[#e8dfd0] bg-white px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#3d3428]">{child.name}</p>
                      <p className="text-[10px] text-[#8b7d6b]">
                        {formatLifespan(child.birth.year, child.death?.year ?? null)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeChild(child.id)}
                      className="shrink-0 rounded-full p-1 text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
                      aria-label={`Retirer ${child.name} de l'union`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {showCustodyPickers ? (
                    <fieldset className="mt-2 border-t border-[#f0e8da] pt-2">
                      <legend className="text-[10px] font-medium uppercase tracking-wider text-[#a8957a]">
                        Ligne de naissance suivie
                      </legend>
                      <div className="mt-1 flex flex-col gap-1">
                        {custodyParents.map((parentId) => {
                          const parent = getIndividual(parentId);
                          if (!parent) return null;
                          const inputId = `follow-${child.id}-${parentId}`;
                          return (
                            <label
                              key={parentId}
                              htmlFor={inputId}
                              className="flex cursor-pointer items-center gap-2 text-xs text-[#5c5244]"
                            >
                              <input
                                id={inputId}
                                type="radio"
                                name={`follow-${child.id}`}
                                checked={form.childFollowParent[child.id] === parentId}
                                onChange={() => setChildFollowParent(child.id, parentId)}
                                className="accent-[#6b7d5a]"
                              />
                              {parent.name}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm text-[#8b7d6b]">
              Aucun enfant lié à cette union pour le moment.
            </p>
          )}
        </Field>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <PersonSearchInput
              label="Ajouter un enfant"
              value={childToAdd}
              onChange={setChildToAdd}
              excludeIds={excludeFromChildSearch}
              placeholder="Rechercher une personne..."
            />
          </div>
          <button
            type="button"
            onClick={addChild}
            disabled={!childToAdd || form.childIds.includes(childToAdd)}
            className="mb-0.5 shrink-0 rounded-lg border border-[#e8dfd0] bg-white px-3 py-2 text-sm font-medium text-[#3d3428] transition-colors hover:bg-[#faf6ef] disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      </div>

      {onRemove ? (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
          {!showRemoveConfirm ? (
            <button
              type="button"
              onClick={() => setShowRemoveConfirm(true)}
              className="inline-flex items-center gap-2 text-sm font-medium text-red-800 transition-colors hover:text-red-900"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer cette union
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-900">
                Cela déliera les partenaires et supprimera le noeud de mariage.
                {form.childIds.length > 0
                  ? " Chaque enfant sera placé sur la ligne de naissance du parent choisi."
                  : ""}
              </p>
              {showRemoveConfirm && form.childIds.length > 0 && custodyParents.length >= 2 ? (
                <p className="text-xs text-red-800">
                  Définissez &ldquo;Ligne de naissance suivie&rdquo; pour chaque enfant ci-dessus, puis confirmez la suppression.
                </p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={removing || saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-100 disabled:opacity-60"
                >
                  {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirmer la suppression
                </button>
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(false)}
                  disabled={removing}
                  className="rounded-lg border border-[#e8dfd0] bg-white px-3 py-2 text-sm text-[#3d3428] hover:bg-[#faf6ef]"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || removing}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#6b7d5a] bg-[#eef4e8] px-4 py-2 text-sm font-medium text-[#4a5c3d] transition-colors hover:bg-[#e4eddb] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving || removing}
          className="rounded-lg border border-[#e8dfd0] bg-white px-4 py-2 text-sm font-medium text-[#3d3428] transition-colors hover:bg-[#faf6ef] disabled:opacity-60"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#a8957a]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#e8dfd0] bg-white px-3 py-2 text-sm text-[#3d3428] outline-none transition-colors focus:border-[#c9b896] focus:ring-2 focus:ring-[#d4b896]/30";
