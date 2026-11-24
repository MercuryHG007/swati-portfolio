"use client";

import { useMemo, useState, useTransition } from "react";
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
import { GripVertical, X } from "lucide-react";
import { toast } from "sonner";
import { addArtworkToSeries, removeArtworkFromSeries, reorderArtworksInSeries } from "../../artworks/actions";
import { ArtworkMultiSelect, type ArtworkOption } from "@/components/admin/artwork-multi-select";
import { ActionIcon, FieldSet, secondaryButtonClass, cardClass } from "@/components/admin/ui";
import { AdminThumbnail } from "@/components/admin/thumbnail";
import { capitalize } from "@/lib/format";

type SeriesArtwork = {
  _id: string;
  title: string;
  status: string;
  thumb?: { publicId: string; alt?: string } | null;
};

export type CatalogArtwork = SeriesArtwork & {
  year: number | null;
  seriesId: string | null;
  seriesTitle: string | null;
};

function SortableArtworkRow({  artwork,
  disabled,
  onRemove,
}: {
  artwork: SeriesArtwork;
  disabled: boolean;
  onRemove: (artwork: SeriesArtwork) => void;
}) {
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
      <AdminThumbnail image={artwork.thumb} alt={artwork.title} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-foreground">{artwork.title}</p>
        <p className="text-xs text-muted">{capitalize(artwork.status)}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(artwork)}
        disabled={disabled}
        aria-label={`Remove ${artwork.title} from series`}
        className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ActionIcon icon={X} />
      </button>
    </div>
  );
}

// Without seriesId this is a new series: changes stay local and are submitted with the form.
export function SeriesArtworksList({
  seriesId,
  seriesTitle,
  initialArtworks = [],
  catalog: initialCatalog,
}: {
  seriesId?: string;
  seriesTitle?: string;
  initialArtworks?: SeriesArtwork[];
  catalog: CatalogArtwork[];
}) {
  const [items, setItems] = useState(initialArtworks);
  // Every artwork, kept in sync with the optimistic add/remove so the picker reflects the current series.
  const [catalog, setCatalog] = useState(initialCatalog);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const memberIds = useMemo(() => items.map((item) => String(item._id)), [items]);
  const pickerOptions = useMemo<ArtworkOption[]>(
    () =>
      catalog.map((artwork) => ({
        id: artwork._id,
        title: artwork.title,
        year: artwork.year ?? undefined,
        note:
          artwork.seriesId && artwork.seriesId !== seriesId && artwork.seriesTitle
            ? `in ${artwork.seriesTitle}, adding moves it here`
            : undefined,
      })),
    [catalog, seriesId]
  );

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
    if (!seriesId) return;
    startTransition(async () => {
      await reorderArtworksInSeries(seriesId, items.map((item) => String(item._id)));
      setIsDirty(false);
      toast.success("Order saved.");
    });
  }

  function handleAdd(artwork: CatalogArtwork) {
    setItems((current) => [...current, { _id: artwork._id, title: artwork.title, status: artwork.status, thumb: artwork.thumb }]);
    if (!seriesId) return;
    setCatalog((current) =>
      current.map((entry) => (entry._id === artwork._id ? { ...entry, seriesId, seriesTitle: seriesTitle ?? null } : entry))
    );
    startTransition(async () => {
      await addArtworkToSeries(seriesId, artwork._id);
      toast.success(`Added "${artwork.title}" to ${seriesTitle}.`);
    });
  }

  function handleRemove(artwork: SeriesArtwork) {
    setItems((current) => current.filter((item) => item._id !== artwork._id));
    if (!seriesId) return;
    setCatalog((current) =>
      current.map((entry) => (entry._id === artwork._id ? { ...entry, seriesId: null, seriesTitle: null } : entry))
    );
    startTransition(async () => {
      await removeArtworkFromSeries(seriesId, artwork._id);
      toast.success(`Removed "${artwork.title}" from ${seriesTitle}.`);
    });
  }

  function handleToggle(id: string) {
    const member = items.find((item) => String(item._id) === id);
    if (member) {
      handleRemove(member);
      return;
    }
    const artwork = catalog.find((entry) => entry._id === id);
    if (artwork) handleAdd(artwork);
  }

  return (
    <div className="flex flex-col gap-8">
      <FieldSet label="Artworks in this series">
        <ArtworkMultiSelect options={pickerOptions} selectedIds={memberIds} onToggle={handleToggle} />
      </FieldSet>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Artwork order</h2>
          {seriesId && isDirty ? (
            <button type="button" onClick={handleSave} disabled={isPending} className={secondaryButtonClass}>
              {isPending ? "Saving…" : "Save order"}
            </button>
          ) : null}
        </div>
        {items.length === 0 ? <p className="text-sm text-muted">No artworks in this series yet.</p> : null}
        <DndContext id={`series-artworks-${seriesId}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={memberIds} strategy={verticalListSortingStrategy}>
            {items.map((artwork) => (
              <SortableArtworkRow key={String(artwork._id)} artwork={artwork} disabled={isPending} onRemove={handleRemove} />
            ))}
          </SortableContext>
        </DndContext>
        {seriesId
          ? null
          : items.map((artwork) => <input key={String(artwork._id)} type="hidden" name="artworks" value={String(artwork._id)} />)}
      </div>
    </div>
  );
}
