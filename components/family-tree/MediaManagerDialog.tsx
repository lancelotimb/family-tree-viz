"use client";

import { useMemo, useState } from "react";
import { ImagePlus, Loader2, Pencil, Trash2, X } from "lucide-react";
import { PersonTagPicker } from "./PersonTagPicker";
import { media as mediaRegistry } from "./familyGraph";
import { useFamilyGraphAdmin } from "./FamilyGraphContext";
import { useGraphRevision } from "./useGraphRevision";
import { uploadMediaFile } from "@/lib/uploadMediaClient";
import type { MediaItem } from "./types";

type MediaManagerDialogProps = {
  open: boolean;
  onClose: () => void;
};

const textareaClass =
  "mt-1 w-full rounded-lg border border-[#e8dfd0] bg-white px-3 py-2 text-sm text-[#3d3428] placeholder:text-[#c4b49a] focus:border-[#a8957a] focus:outline-none focus:ring-1 focus:ring-[#a8957a]";

function MediaEditor({
  item,
  onDone,
  onCancel,
}: {
  item: MediaItem | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { addMedia, updateMedia, removeMedia, generateMediaId, saving } = useFamilyGraphAdmin();
  const isNew = item === null;
  const [mediaId] = useState(() => item?.id ?? generateMediaId());
  const [legend, setLegend] = useState(item?.legend ?? "");
  const [taggedPersonIds, setTaggedPersonIds] = useState<string[]>(item?.taggedPersonIds ?? []);
  const [url, setUrl] = useState(item?.url ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploadedUrl = await uploadMediaFile(file, "gallery", {
        mediaId,
        filename: file.name,
      });
      setUrl(uploadedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!url.trim()) {
      setError("Envoyez une image avant d'enregistrer.");
      return;
    }
    setError(null);
    const payload = { url, legend, taggedPersonIds };
    const ok = isNew
      ? await addMedia(mediaId, payload)
      : await updateMedia(mediaId, payload);
    if (ok) onDone();
    else setError("Impossible d'enregistrer l'image de la galerie.");
  };

  const handleDelete = async () => {
    if (!item || !window.confirm("Supprimer cette image de la galerie ?")) return;
    const ok = await removeMedia(item.id);
    if (ok) onDone();
    else setError("Impossible de supprimer l'image de la galerie.");
  };

  return (
    <div className="rounded-xl border border-[#e8dfd0] bg-[#faf6ef] p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="mx-auto w-40 shrink-0">
          {url ? (
            <img
              src={url}
              alt=""
              className="aspect-square w-full rounded-lg border border-[#e8dfd0] object-cover"
            />
          ) : (
            <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#e8dfd0] bg-white text-center transition-colors hover:border-[#c4b49a]">
              <ImagePlus className="h-8 w-8 text-[#a8957a]" />
              <span className="px-2 text-xs text-[#8b7d6b]">Envoyer une image</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => void handleFileChange(e)}
                disabled={uploading}
              />
            </label>
          )}
          {url ? (
            <label className="mt-2 block cursor-pointer text-center text-xs text-[#6b7d5a] hover:underline">
              Remplacer l&apos;image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => void handleFileChange(e)}
                disabled={uploading}
              />
            </label>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-[#8b7d6b]">
            Légende
            <textarea
              value={legend}
              onChange={(e) => setLegend(e.target.value)}
              rows={4}
              placeholder="Décrivez la photo... Les retours à la ligne sont conservés."
              className={textareaClass}
            />
          </label>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8b7d6b]">
              Personnes identifiées
            </p>
            <PersonTagPicker taggedPersonIds={taggedPersonIds} onChange={setTaggedPersonIds} />
          </div>
        </div>
      </div>

      {uploading ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-[#8b7d6b]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Envoi en cours...
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <div>
          {!isNew ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#e8dfd0] bg-white px-4 py-2 text-sm text-[#6b5f4f] hover:bg-[#faf6ef]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 rounded-full bg-[#5a7a5a] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a6a4a] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

export function MediaManagerDialog({ open, onClose }: MediaManagerDialogProps) {
  const graphRevision = useGraphRevision();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  void graphRevision;

  const items = useMemo(
    () => Object.values(mediaRegistry).sort((a, b) => a.id.localeCompare(b.id)),
    [graphRevision],
  );

  const editingItem =
    editingId === "new" ? null : editingId ? (mediaRegistry[editingId] ?? null) : null;

  const handleClose = () => {
    setEditingId(null);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-[#3d3428]/30" onClick={handleClose} aria-hidden />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="media-manager-title"
        className="fixed left-1/2 top-1/2 z-[70] flex max-h-[90dvh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[#e8dfd0] bg-[#fffef9] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e8dfd0] px-6 py-5">
          <div>
            <h2 id="media-manager-title" className="font-serif text-xl text-[#3d3428]">
              Gérer la galerie
            </h2>
            <p className="mt-1 text-sm text-[#8b7d6b]">
              Envoyez les photos de l&apos;arbre une seule fois, identifiez les personnes,
              et elles apparaîtront dans chaque profil.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {editingId !== null ? (
            <MediaEditor
              key={editingId}
              item={editingItem}
              onDone={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditingId("new")}
                className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#5a7a5a] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a6a4a]"
              >
                <ImagePlus className="h-4 w-4" />
                Ajouter une image
              </button>

              {items.length === 0 ? (
                <p className="text-sm text-[#8b7d6b]">Aucune image dans la galerie pour le moment.</p>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-3 rounded-xl border border-[#e8dfd0] bg-[#faf6ef] p-3"
                    >
                      {item.url ? (
                        <img
                          src={item.url}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg border border-[#e8dfd0] object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#e8dfd0] bg-white text-[10px] text-[#c4b49a]">
                          Aucun fichier
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 whitespace-pre-line text-sm text-[#3d3428]">
                          {item.legend.trim() || "Aucune légende"}
                        </p>
                        <p className="mt-1 text-xs text-[#8b7d6b]">
                          {item.taggedPersonIds.length} identifié(s)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingId(item.id)}
                        className="shrink-0 self-start rounded-full p-2 text-[#8b7d6b] hover:bg-[#f0e8da] hover:text-[#3d3428]"
                        aria-label="Modifier l'image"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
