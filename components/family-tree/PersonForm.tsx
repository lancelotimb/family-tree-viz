"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PersonFormData } from "./graphMutations";
import { individualToFormData } from "./graphMutations";
import type { Individual } from "./types";
import { useUnionOptions } from "./FamilyGraphContext";

type PersonFormProps = {
  initial: PersonFormData;
  onSubmit: (data: PersonFormData) => Promise<boolean>;
  onCancel: () => void;
  submitLabel: string;
  showBirthFamily?: boolean;
};

const emptyForm: PersonFormData = {
  firstName: "",
  middleNames: "",
  familyName: "",
  gender: "male",
  birthYear: "",
  birthPlace: "",
  deathYear: "",
  deathPlace: "",
  biography: "",
  famc: null,
};

export function createEmptyPersonForm(): PersonFormData {
  return { ...emptyForm };
}

export function personToForm(person: Individual): PersonFormData {
  return individualToFormData(person);
}

function PersonForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  showBirthFamily = false,
}: PersonFormProps) {
  const unionOptions = useUnionOptions();
  const [form, setForm] = useState<PersonFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial);
    setError(null);
  }, [initial]);

  const updateField = <K extends keyof PersonFormData>(key: K, value: PersonFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.familyName.trim()) {
      setError("Le prénom et le nom de famille sont obligatoires.");
      return;
    }
    setSaving(true);
    setError(null);
    const ok = await onSubmit(form);
    setSaving(false);
    if (!ok) {
      setError("Impossible d'enregistrer les changements dans le fichier GEDCOM.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom">
          <input
            value={form.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Nom de famille">
          <input
            value={form.familyName}
            onChange={(e) => updateField("familyName", e.target.value)}
            className={inputClass}
            required
          />
        </Field>
      </div>

      <Field label="Autres prénoms">
        <input
          value={form.middleNames}
          onChange={(e) => updateField("middleNames", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Genre">
        <select
          value={form.gender}
          onChange={(e) => updateField("gender", e.target.value as PersonFormData["gender"])}
          className={inputClass}
        >
          <option value="male">Homme</option>
          <option value="female">Femme</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date de naissance">
          <input
            value={form.birthYear}
            onChange={(e) => updateField("birthYear", e.target.value)}
            className={inputClass}
            placeholder="ex. 1924"
          />
        </Field>
        <Field label="Date de décès">
          <input
            value={form.deathYear}
            onChange={(e) => updateField("deathYear", e.target.value)}
            className={inputClass}
            placeholder="Laisser vide si la personne est vivante"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Lieu de naissance">
          <input
            value={form.birthPlace}
            onChange={(e) => updateField("birthPlace", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Lieu de décès">
          <input
            value={form.deathPlace}
            onChange={(e) => updateField("deathPlace", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {showBirthFamily ? (
        <Field label="Famille de naissance (facultatif)">
          <select
            value={form.famc ?? ""}
            onChange={(e) => updateField("famc", e.target.value || null)}
            className={inputClass}
          >
            <option value="">Aucune</option>
            {unionOptions.map((union) => (
              <option key={union.id} value={union.id}>
                {union.label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field label="Biographie">
        <textarea
          value={form.biography}
          onChange={(e) => updateField("biography", e.target.value)}
          className={`${inputClass} min-h-24 resize-y`}
        />
      </Field>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#6b7d5a] bg-[#eef4e8] px-4 py-2 text-sm font-medium text-[#4a5c3d] transition-colors hover:bg-[#e4eddb] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
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

type EditPersonFormProps = {
  person: Individual;
  onSubmit: (data: PersonFormData) => Promise<boolean>;
  onCancel: () => void;
};

export function EditPersonForm({ person, onSubmit, onCancel }: EditPersonFormProps) {
  return (
    <PersonForm
      initial={personToForm(person)}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Enregistrer les changements"
      showBirthFamily
    />
  );
}

type AddPersonFormProps = {
  onSubmit: (data: PersonFormData) => Promise<boolean>;
  onCancel: () => void;
};

export function AddPersonForm({ onSubmit, onCancel }: AddPersonFormProps) {
  return (
    <PersonForm
      initial={createEmptyPersonForm()}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Ajouter la personne"
      showBirthFamily
    />
  );
}
