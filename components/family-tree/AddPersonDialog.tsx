"use client";

import { X } from "lucide-react";
import { AddPersonForm } from "./PersonForm";
import type { PersonFormData } from "./graphMutations";

type AddPersonDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PersonFormData) => Promise<boolean>;
};

export function AddPersonDialog({ open, onClose, onSubmit }: AddPersonDialogProps) {
  if (!open) return null;

  const handleSubmit = async (data: PersonFormData) => {
    const ok = await onSubmit(data);
    if (ok) onClose();
    return ok;
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-[#3d3428]/30"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="add-person-title"
        className="fixed left-1/2 top-1/2 z-[70] max-h-[90dvh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#e8dfd0] bg-[#fffef9] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="add-person-title" className="font-serif text-xl text-[#3d3428]">
              Ajouter une personne
            </h2>
            <p className="mt-1 text-sm text-[#8b7d6b]">
              Crée une nouvelle entrée dans l&apos;arbre généalogique et l&apos;enregistre dans le fichier GEDCOM.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <AddPersonForm onSubmit={handleSubmit} onCancel={onClose} />
      </div>
    </>
  );
}
