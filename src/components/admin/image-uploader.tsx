"use client";

import { useState } from "react";

export type CloudinaryImageValue = {
  publicId: string;
  width: number;
  height: number;
  alt: string;
};

type ImageUploaderProps = {
  name: string;
  folder: string;
  initial?: CloudinaryImageValue[];
  multiple?: boolean;
};

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

function thumbUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_160,h_160,c_fill/${publicId}`;
}

export function ImageUploader({ name, folder, initial = [], multiple = false }: ImageUploaderProps) {
  const [images, setImages] = useState<CloudinaryImageValue[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: CloudinaryImageValue[] = [];
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);
        const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? "Upload failed");
        }
        uploaded.push({ publicId: data.publicId, width: data.width, height: data.height, alt: "" });
      }
      setImages((prev) => (multiple ? [...prev, ...uploaded] : uploaded.slice(0, 1)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function updateAlt(index: number, alt: string) {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, alt } : img)));
  }

  function remove(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  const serialized = multiple ? JSON.stringify(images) : JSON.stringify(images[0] ?? null);

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={serialized} readOnly />
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-4">
          {images.map((img, index) => (
            <div key={`${img.publicId}-${index}`} className="flex w-40 flex-col gap-2">
              {CLOUD_NAME ? (
                // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail preview, not a page image
                <img
                  src={thumbUrl(img.publicId)}
                  alt={img.alt || ""}
                  className="h-40 w-40 rounded-md border border-border object-cover"
                />
              ) : null}
              <input
                type="text"
                placeholder="Alt text"
                value={img.alt}
                onChange={(event) => updateAlt(index, event.target.value)}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple={multiple}
        onChange={(event) => handleFiles(event.target.files)}
        disabled={uploading}
        className="text-sm text-foreground"
      />
      {uploading ? <p className="text-xs text-muted">Uploading…</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
