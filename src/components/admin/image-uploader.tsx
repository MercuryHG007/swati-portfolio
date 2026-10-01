"use client";

import { useId, useState } from "react";
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

export type CloudinaryImageValue = {
  publicId: string;
  width: number;
  height: number;
  alt: string;
};

// Client-only id so dnd-kit can track each thumbnail through reorders/removals;
// never sent to the server (stripped when serializing into the hidden input).
type ImageItem = CloudinaryImageValue & { uid: string };

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

function withUid(image: CloudinaryImageValue): ImageItem {
  return { ...image, uid: crypto.randomUUID() };
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

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex w-40 flex-col gap-2"
    >
      <div className="relative">
        {CLOUD_NAME ? (
          // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail preview, not a page image
          <img
            src={thumbUrl(item.publicId)}
            alt={item.alt || ""}
            className="h-40 w-40 rounded-md border border-border object-cover"
          />
        ) : null}
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
      <input
        type="text"
        placeholder="Alt text"
        value={item.alt}
        onChange={(event) => onAltChange(event.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
      />
      <button type="button" onClick={onRemove} className="text-xs text-red-600 hover:underline">
        Remove
      </button>
    </div>
  );
}

export function ImageUploader({ name, folder, initial = [], multiple = false }: ImageUploaderProps) {
  const inputId = useId();
  const [images, setImages] = useState<ImageItem[]>(() => initial.map(withUid));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: ImageItem[] = [];
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);
        const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? "Upload failed");
        }
        uploaded.push(withUid({ publicId: data.publicId, width: data.width, height: data.height, alt: "" }));
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

  const plain: CloudinaryImageValue[] = images.map((img) => ({
    publicId: img.publicId,
    width: img.width,
    height: img.height,
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
        accept="image/*"
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

