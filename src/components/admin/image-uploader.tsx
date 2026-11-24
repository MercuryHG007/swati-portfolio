"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { r2MediaUrl } from "@/lib/media-storage";
import { formatFileSize } from "@/lib/format";

export type MediaImageValue = {
  publicId: string;
  width: number;
  height: number;
  bytes?: number;
  alt: string;
};

// Client-only id so dnd-kit can track each thumbnail through reorders/removals;
// never sent to the server (stripped when serializing into the hidden input).
type ImageItem = MediaImageValue & { uid: string };

type ImageUploaderProps = {
  name: string;
  folder: string;
  initial?: MediaImageValue[];
  multiple?: boolean;
  // Lets a parent react to how many images are currently attached (e.g. to show a hint).
  onCountChange?: (count: number) => void;
};

function thumbUrl(publicId: string) {
  return r2MediaUrl(publicId, 160);
}

type UploadResult = { ok: boolean; error?: string; publicId: string; width: number; height: number; bytes?: number };
type SignedUpload = { ok: boolean; error?: string; publicId: string; uploadUrl: string };

async function postJson<T extends { ok: boolean; error?: string }>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T;
  if (!res.ok || !data.ok) throw new Error(data.error ?? "Upload failed");
  return data;
}

// The file goes straight to R2 with a signed URL, then the server builds the variants from it.
async function uploadImage(file: File, folder: string): Promise<UploadResult> {
  const signed = await postJson<SignedUpload>("/api/admin/upload/sign", { folder, contentType: file.type });
  try {
    const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!put.ok) throw new Error(`Upload failed (${put.status})`);
    return await postJson<UploadResult>("/api/admin/upload/process", { publicId: signed.publicId });
  } catch (err) {
    discardUploads([signed.publicId]);
    throw err;
  }
}

function withUid(image: MediaImageValue): ImageItem {
  return { ...image, uid: crypto.randomUUID() };
}

const DISCARD_URL = "/api/admin/upload/discard";

// Destroys uploads the admin never saved. The server skips anything a saved record still references.
function discardUploads(publicIds: string[], viaBeacon = false) {
  if (publicIds.length === 0) return;
  const body = JSON.stringify({ publicIds });
  if (viaBeacon) {
    navigator.sendBeacon(DISCARD_URL, new Blob([body], { type: "application/json" }));
    return;
  }
  fetch(DISCARD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

function SortableThumb({
  item,
  onAltChange,
  onRemove,
}: {
  item: ImageItem;
  onAltChange: (alt: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const size = formatFileSize(item.bytes);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex w-40 flex-col gap-2"
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail preview, not a page image */}
        <img
          src={thumbUrl(item.publicId)}
          alt={item.alt || ""}
          className="h-40 w-40 rounded-md border border-border object-cover"
        />
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reorder image"
          className="absolute left-1 top-1 cursor-grab touch-none rounded bg-surface/80 p-1 text-muted hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      {size ? <p className="text-xs text-muted">{size}</p> : null}
      <input
        type="text"
        placeholder="Alt text"
        value={item.alt}
        onChange={(event) => onAltChange(event.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
      />
      <button type="button" onClick={onRemove} className="cursor-pointer text-xs text-red-600 hover:underline">
        Remove
      </button>
    </div>
  );
}

export function ImageUploader({ name, folder, initial = [], multiple = false, onCountChange }: ImageUploaderProps) {
  const inputId = useId();
  const [images, setImages] = useState<ImageItem[]>(() => initial.map(withUid));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  // Public ids uploaded during this visit that no save has taken yet. Pre-existing images are never in here.
  const unsavedRef = useRef(new Set<string>());
  const mountedRef = useRef(false);

  useEffect(() => {
    const unsaved = unsavedRef.current;
    mountedRef.current = true;
    const discardOnPageHide = () => discardUploads([...unsaved], true);
    window.addEventListener("pagehide", discardOnPageHide);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("pagehide", discardOnPageHide);
      discardUploads([...unsaved]);
      unsaved.clear();
    };
  }, []);

  useEffect(() => {
    onCountChange?.(images.length);
  }, [images.length, onCountChange]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: ImageItem[] = [];
      for (const file of Array.from(fileList)) {
        if (!mountedRef.current) break;
        const data = await uploadImage(file, folder);
        if (mountedRef.current) {
          unsavedRef.current.add(data.publicId);
        } else {
          // The form was left while this file was uploading, so nothing will clean it up later.
          discardUploads([data.publicId]);
          break;
        }
        uploaded.push(
          withUid({ publicId: data.publicId, width: data.width, height: data.height, bytes: data.bytes, alt: "" })
        );
      }
      setImages((prev) => (multiple ? [...prev, ...uploaded] : uploaded.slice(0, 1)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function updateAlt(uid: string, alt: string) {
    setImages((prev) => prev.map((img) => (img.uid === uid ? { ...img, alt } : img)));
  }

  function remove(uid: string) {
    const target = images.find((img) => img.uid === uid);
    if (target && unsavedRef.current.delete(target.publicId)) discardUploads([target.publicId]);
    setImages((prev) => prev.filter((img) => img.uid !== uid));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setImages((current) => {
      const oldIndex = current.findIndex((img) => img.uid === active.id);
      const newIndex = current.findIndex((img) => img.uid === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  const plain: MediaImageValue[] = images.map((img) => ({
    publicId: img.publicId,
    width: img.width,
    height: img.height,
    bytes: img.bytes,
    alt: img.alt,
  }));
  const serialized = multiple ? JSON.stringify(plain) : JSON.stringify(plain[0] ?? null);

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={serialized} readOnly />
      {images.length > 0 ? (
        <DndContext
          id={`image-uploader-${name}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images.map((img) => img.uid)} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-4">
              {images.map((img) => (
                <SortableThumb
                  key={img.uid}
                  item={img}
                  onAltChange={(alt) => updateAlt(img.uid, alt)}
                  onRemove={() => remove(img.uid)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}
      <input
        id={inputId}
        type="file"
        // No `accept` filter — some mobile browsers (notably Android) force a restrictive
        // picker (e.g. Google Photos only) even with "image/*"; the server still enforces
        // ALLOWED_TYPES regardless of what's selected here.
        multiple={multiple}
        onChange={(event) => handleFiles(event.target.files)}
        disabled={uploading}
        className="sr-only"
      />
      <label
        htmlFor={inputId}
        className={`w-fit text-sm text-accent underline ${uploading ? "pointer-events-none opacity-50" : "cursor-pointer hover:text-accent/80"}`}
      >
        Upload image{multiple ? "s" : ""}
      </label>
      {uploading ? <p className="text-xs text-muted">Uploading…</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

