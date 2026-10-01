"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { deleteSeries, reorderSeries } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ActionIcon, buttonClass, secondaryButtonClass, cardClass } from "@/components/admin/ui";

type SeriesItem = { _id: string; title: string; status: string };

function SortableSeriesCard({ item }: { item: SeriesItem }) {
  const id = String(item._id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`${cardClass} flex items-center justify-between gap-3`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${item.title}`}
          className="cursor-grab touch-none text-muted hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <p className="text-foreground">{item.title}</p>
      </div>
      <div className="flex gap-2">
        <Link href={`/admin/series/${id}`} aria-label={`Edit ${item.title}`}>
          <ActionIcon icon={Pencil} />
        </Link>
        <form action={deleteSeries}>
          <input type="hidden" name="id" value={id} />
          <ConfirmButton
            confirmText={`Delete series "${item.title}"? Its artworks will become standalone.`}
            aria-label={`Delete ${item.title}`}
          >
            <ActionIcon icon={Trash2} variant="danger" />
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}

export function SeriesList({ initialSeries }: { initialSeries: SeriesItem[] }) {
  const [items, setItems] = useState(initialSeries);
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
      await reorderSeries(items.map((item) => String(item._id)));
      setIsDirty(false);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Series</h1>
        <div className="flex gap-2">
          {isDirty ? (
            <button type="button" onClick={handleSave} disabled={isPending} className={secondaryButtonClass}>
              {isPending ? "Saving…" : "Save order"}
            </button>
          ) : null}
          <Link href="/admin/series/new" className={buttonClass}>
            New series
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <DndContext id="series-list" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((item) => String(item._id))} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <SortableSeriesCard key={String(item._id)} item={item} />
            ))}
          </SortableContext>
        </DndContext>
        {items.length === 0 ? <p className="text-muted">No series yet.</p> : null}
      </div>
    </>
  );
}
