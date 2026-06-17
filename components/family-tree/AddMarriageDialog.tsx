"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { getIndividual } from "./familyGraph";
import { PersonSearchInput } from "./PersonSearchInput";
import type { AddMarriageFormData } from "./graphMutations";

type AddMarriageDialogProps = {
  open: boolean;
  presetPartnerId?: string;
  onClose: () => void;
  onSubmit: (data: AddMarriageFormData) => Promise<{ ok: boolean; error?: string }>;
};

const emptyForm: AddMarriageFormData = {
  partner1Id: "",
  partner2Id: "",
  marriageYear: "",
  marriagePlace: "",
};

export function AddMarriageDialog({
  open,
  presetPartnerId = "",
  onClose,
  onSubmit,
}: AddMarriageDialogProps) {
  const [form, setForm] = useState<AddMarriageFormData>({
    ...emptyForm,
    partner1Id: presetPartnerId,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyForm, partner1Id: presetPartnerId });
    setError(null);
  }, [open, presetPartnerId]);

  if (!open) return null;

  const updateField = <K extends keyof AddMarriageFormData>(
    key: K,
    value: AddMarriageFormData[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.partner1Id || !form.partner2Id) {
      setError("Both partners are required.");
      return;
    }
    if (form.partner1Id === form.partner2Id) {
      setError("Choose two different people.");
      return;
    }

    setSaving(true);
    setError(null);
    const result = await onSubmit(form);
    setSaving(false);
    if (result.ok) {
      onClose();
    } else {
      setError(result.error ?? "Could not save marriage to the GEDCOM file.");
    }
  };

  const partner1 = getIndividual(form.partner1Id);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-[#3d3428]/30" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="add-marriage-title"
        className="fixed left-1/2 top-1/2 z-[70] max-h-[90dvh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#e8dfd0] bg-[#fffef9] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="add-marriage-title" className="font-serif text-xl text-[#3d3428]">
              Add marriage
            </h2>
            <p className="mt-1 text-sm text-[#8b7d6b]">
              Links two people in a new union and saves to the GEDCOM file.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PersonSearchInput
            label="Partner 1"
            value={form.partner1Id}
            onChange={(id) => updateField("partner1Id", id)}
            excludeId={form.partner2Id}
            placeholder="Search a person…"
          />
          <PersonSearchInput
            label="Partner 2"
            value={form.partner2Id}
            onChange={(id) => updateField("partner2Id", id)}
            excludeId={form.partner1Id}
            placeholder="Search a person…"
          />

          {partner1 ? (
            <p className="text-xs text-[#8b7d6b]">
              Creating a union for {partner1.name}
              {form.partner2Id && getIndividual(form.partner2Id)
                ? ` and ${getIndividual(form.partner2Id)!.name}`
                : ""}
              .
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Marriage year">
              <input
                value={form.marriageYear}
                onChange={(e) => updateField("marriageYear", e.target.value)}
                className={inputClass}
                placeholder="Optional"
              />
            </Field>
            <Field label="Marriage place">
              <input
                value={form.marriagePlace}
                onChange={(e) => updateField("marriagePlace", e.target.value)}
                className={inputClass}
                placeholder="Optional"
              />
            </Field>
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#6b7d5a] bg-[#eef4e8] px-4 py-2 text-sm font-medium text-[#4a5c3d] transition-colors hover:bg-[#e4eddb] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add marriage
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-[#e8dfd0] bg-white px-4 py-2 text-sm font-medium text-[#3d3428] transition-colors hover:bg-[#faf6ef] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
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
