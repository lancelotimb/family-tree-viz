"use client";

import { X } from "lucide-react";
import { getUnion, unionSearchIndex } from "./familyGraph";
import type { RemoveUnionFormData, UnionFormData } from "./graphMutations";
import { UnionForm } from "./UnionForm";
import { useGraphRevision } from "./useGraphRevision";

type UnionEditDialogProps = {
  unionId: string | null;
  onClose: () => void;
  onSubmit: (unionId: string, data: UnionFormData) => Promise<{ ok: boolean; error?: string }>;
  onRemove: (unionId: string, data: RemoveUnionFormData) => Promise<{ ok: boolean; error?: string }>;
};

export function UnionEditDialog({ unionId, onClose, onSubmit, onRemove }: UnionEditDialogProps) {
  const graphRevision = useGraphRevision();
  const union = getUnion(unionId);

  void graphRevision;

  if (!unionId || !union) return null;

  const label = unionSearchIndex.find((entry) => entry.id === unionId)?.label ?? "Union";

  const handleSubmit = async (data: UnionFormData) => {
    const result = await onSubmit(unionId, data);
    if (result.ok) onClose();
    return result;
  };

  const handleRemove = async (data: RemoveUnionFormData) => {
    const result = await onRemove(unionId, data);
    if (result.ok) onClose();
    return result;
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-[#3d3428]/30" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="edit-union-title"
        className="fixed left-1/2 top-1/2 z-[70] max-h-[90dvh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#e8dfd0] bg-[#fffef9] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="edit-union-title" className="font-serif text-xl text-[#3d3428]">
              Modifier l&apos;union
            </h2>
            <p className="mt-1 text-sm text-[#8b7d6b]">{label}</p>
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
        <UnionForm
          key={unionId}
          union={union}
          onSubmit={handleSubmit}
          onRemove={handleRemove}
          onCancel={onClose}
          submitLabel="Enregistrer l'union"
        />
      </div>
    </>
  );
}
