"use client";

import { useMemo, useState, useTransition } from "react";
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
import { toast } from "sonner";
import { deleteSeries, reorderSeries } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { AdminThumbnail } from "@/components/admin/thumbnail";
import { ActionIcon, Select, buttonClass, secondaryButtonClass, cardClass, inputClass } from "@/components/admin/ui";
import { capitalize } from "@/lib/format";

type SeriesItem = {
  _id: string;
  title: string;
  status: string;
  featured: boolean;
  coverImage?: { publicId: string; alt?: string } | null;
  uploadedAt: number;
};

type SortKey = "order" | "uploadNewest" | "uploadOldest" | "title";

function SortableSeriesCard({ item, canReorder }: { item: SeriesItem; canReorder: boolean }) {
  const id = String(item._id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !canReorder,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`${cardClass} flex items-center justify-between gap-3`}
    >
      <div className="flex items-center gap-3">
        {canReorder ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${item.title}`}
            className="cursor-grab touch-none text-muted hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <AdminThumbnail image={item.coverImage} alt={item.title} />
        <div className="min-w-0">
          <p className="truncate text-foreground">{item.title}</p>
          <p className="text-xs text-muted">
            {[item.featured ? "Featured" : null, capitalize(item.status)].filter(Boolean).join(" · ")}
          </p>
        </div>
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortKey>("order");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const isFiltered = query.trim() !== "" || status !== "all";
  // Reordering only makes sense on the full list in its saved order.
  const canReorder = sort === "order" && !isFiltered;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter(
      (item) =>
        (!q || item.title.toLowerCase().includes(q)) &&
        (status === "all" || (status === "featured" ? item.featured : item.status === status))
    );
    if (sort === "order") return list;
    if (sort === "title") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "uploadNewest") return [...list].sort((a, b) => b.uploadedAt - a.uploadedAt);
    return [...list].sort((a, b) => a.uploadedAt - b.uploadedAt);
  }, [items, query, status, sort]);

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
      toast.success("Order saved.");
    });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          Series
          <span className="ml-2 text-base font-normal text-muted">
            {isFiltered ? `${visible.length} of ${items.length}` : items.length}
          </span>
        </h1>
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
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title"
          aria-label="Search series by title"
          className={`${inputClass} w-full`}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="featured">Featured</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </Select>
          <Select aria-label="Sort series" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="order">Default order</option>
            <option value="uploadNewest">Uploaded, newest</option>
            <option value="uploadOldest">Uploaded, oldest</option>
            <option value="title">Title A–Z</option>
          </Select>
        </div>
        {!canReorder ? <p className="text-xs text-muted">Reordering is available in Default order with no filters.</p> : null}
      </div>

      <div className="flex flex-col gap-3">
        <DndContext id="series-list" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visible.map((item) => String(item._id))} strategy={verticalListSortingStrategy}>
            {visible.map((item) => (
              <SortableSeriesCard key={String(item._id)} item={item} canReorder={canReorder} />
            ))}
          </SortableContext>
        </DndContext>
        {items.length === 0 ? <p className="text-muted">No series yet.</p> : null}
        {items.length > 0 && visible.length === 0 ? (
          <p className="text-muted">No series match these filters.</p>
        ) : null}
      </div>
    </>
  );
}
