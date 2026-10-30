"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { reorderArtworksInSeries } from "../../artworks/actions";
import { secondaryButtonClass, cardClass } from "@/components/admin/ui";

type SeriesArtwork = { _id: string; title: string; status: string };

function SortableArtworkRow({ artwork }: { artwork: SeriesArtwork }) {
  const id = String(artwork._id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`${cardClass} flex items-center gap-3`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${artwork.title}`}
        className="cursor-grab touch-none text-muted hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <p className="text-foreground">{artwork.title}</p>
      <p className="text-xs text-muted">{artwork.status}</p>
    </div>
  );
}

export function SeriesArtworksList({
  seriesId,
  initialArtworks,
}: {
  seriesId: string;
  initialArtworks: SeriesArtwork[];
}) {
  const [items, setItems] = useState(initialArtworks);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const oldIndex = current.findIndex((item) => String(item._id) === active.id);
      const newIndex = current.findIndex((item) => String(item._id) === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
    setIsDirty(true);
  }

  function handleSave() {
    startTransition(async () => {
      await reorderArtworksInSeries(seriesId, items.map((item) => String(item._id)));
      setIsDirty(false);
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Artwork order</h2>
        {isDirty ? (
          <button type="button" onClick={handleSave} disabled={isPending} className={secondaryButtonClass}>
            {isPending ? "Saving…" : "Save order"}
          </button>
        ) : null}
      </div>
      <DndContext id={`series-artworks-${seriesId}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => String(item._id))} strategy={verticalListSortingStrategy}>
          {items.map((artwork) => (
            <SortableArtworkRow key={String(artwork._id)} artwork={artwork} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
