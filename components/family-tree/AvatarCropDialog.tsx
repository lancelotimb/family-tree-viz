"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, Upload, X } from "lucide-react";
import { getCroppedImageBlob } from "./cropImage";
import { uploadMediaFile } from "@/lib/uploadMediaClient";

type AvatarCropDialogProps = {
  open: boolean;
  personId: string;
  onClose: () => void;
  onUploaded: (url: string) => Promise<boolean>;
};

export function AvatarCropDialog({
  open,
  personId,
  onClose,
  onUploaded,
}: AvatarCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setError(null);
    setUploading(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
    });
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedArea) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedArea);
      const url = await uploadMediaFile(blob, "avatar", {
        personId,
        filename: "avatar.webp",
      });
      const ok = await onUploaded(url);
      if (ok) handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-[#3d3428]/30" onClick={handleClose} aria-hidden />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="avatar-crop-title"
        className="fixed left-1/2 top-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#e8dfd0] bg-[#fffef9] p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="avatar-crop-title" className="font-serif text-xl text-[#3d3428]">
              Upload avatar
            </h2>
            <p className="mt-1 text-sm text-[#8b7d6b]">Crop to a square before saving.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!imageSrc ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e8dfd0] bg-[#faf6ef] px-6 py-12 text-center transition-colors hover:border-[#c4b49a]">
            <Upload className="h-8 w-8 text-[#a8957a]" />
            <span className="text-sm font-medium text-[#3d3428]">Choose a photo</span>
            <span className="text-xs text-[#8b7d6b]">JPEG, PNG, or WebP up to 5 MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <>
            <div className="relative h-64 overflow-hidden rounded-xl bg-[#3d3428]">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-[#8b7d6b]">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-1 w-full accent-[#5a7a5a]"
              />
            </label>
          </>
        )}

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-[#e8dfd0] bg-white px-4 py-2 text-sm text-[#6b5f4f] transition-colors hover:bg-[#faf6ef]"
          >
            Cancel
          </button>
          {imageSrc ? (
            <button
              type="button"
              disabled={uploading || !croppedArea}
              onClick={() => void handleUpload()}
              className="inline-flex items-center gap-2 rounded-full bg-[#5a7a5a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4a6a4a] disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save avatar
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
