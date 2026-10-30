import Link from "next/link";
import { ImageUploader } from "@/components/admin/image-uploader";
import { ArtworkMultiSelect } from "@/components/admin/artwork-multi-select";
import { Field, Select, inputClass, buttonClass, secondaryButtonClass } from "@/components/admin/ui";
import { getAllArtworks } from "@/lib/admin-queries";
import { getYear } from "@/lib/format";

function toDateInputValue(date?: Date | string) {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toISOString().slice(0, 10);
}

export async function ExhibitionForm({
  exhibition,
  action,
}: {
  exhibition?: {
    _id: unknown;
    title: string;
    slug: string;
    venue: string;
    city: string;
    country: string;
    type: string;
    startDate?: Date | string;
    endDate?: Date | string;
    description: string;
    images: { publicId: string; width: number; height: number; alt: string }[];
    status: string;
    artworks?: unknown[];
  };
  action: (formData: FormData) => void;
}) {
  const allArtworks = await getAllArtworks();
  const artworkOptions = allArtworks.map((artwork) => ({
    id: String(artwork._id),
    title: artwork.title,
    year: getYear(artwork.dateMade),
  }));
  const initialSelectedIds = (exhibition?.artworks ?? []).map(String);

  return (
    <form action={action} className="flex flex-col gap-4">
      {exhibition ? <input type="hidden" name="id" value={String(exhibition._id)} /> : null}

      <Field label="Title">
        <input name="title" defaultValue={exhibition?.title} required className={inputClass} />
      </Field>
      <input type="hidden" name="slug" defaultValue={exhibition?.slug} />
      <Field label="Venue">
        <input name="venue" defaultValue={exhibition?.venue} required className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          <input name="city" defaultValue={exhibition?.city} className={inputClass} />
        </Field>
        <Field label="Country">
          <input name="country" defaultValue={exhibition?.country} className={inputClass} />
        </Field>
      </div>
      <Field label="Type">
        <Select name="type" defaultValue={exhibition?.type ?? "group"}>
          <option value="group">Group</option>
          <option value="solo">Solo</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <input
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(exhibition?.startDate)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="End date">
          <input
            name="endDate"
            type="date"
            defaultValue={toDateInputValue(exhibition?.endDate)}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Description">
        <textarea name="description" defaultValue={exhibition?.description} rows={4} className={inputClass} />
      </Field>
      <Field label="Images">
        <ImageUploader
          name="images"
          folder="swati-portfolio/exhibitions"
          initial={exhibition?.images ?? []}
          multiple
        />
      </Field>
      <Field label="Artworks shown at this exhibition">
        <ArtworkMultiSelect name="artworks" options={artworkOptions} initialSelectedIds={initialSelectedIds} />
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={exhibition?.status ?? "hidden"}>
          <option value="hidden">Hidden</option>
          <option value="published">Published</option>
        </Select>
      </Field>

      <div className="flex gap-3">
        <button type="submit" className={buttonClass}>
          Save
        </button>
        <Link href="/admin/exhibitions" className={secondaryButtonClass}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
