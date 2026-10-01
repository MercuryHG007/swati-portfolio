import Link from "next/link";
import { getAllMediums, getAllSubjects, getAllSeries } from "@/lib/admin-queries";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Field, Select, inputClass, buttonClass, secondaryButtonClass } from "@/components/admin/ui";

export async function ArtworkForm({
  artwork,
  action,
}: {
  artwork?: {
    _id: unknown;
    title: string;
    slug: string;
    images: { publicId: string; width: number; height: number; alt: string }[];
    year?: number;
    medium: unknown;
    subjects: unknown[];
    series: unknown;
    dimensions?: { height?: number; width?: number; depth?: number; unit?: string };
    description: string;
    status: string;
    featured: boolean;
  };
  action: (formData: FormData) => void;
}) {
  const [mediums, subjects, series] = await Promise.all([getAllMediums(), getAllSubjects(), getAllSeries()]);

  const selectedMediumId = artwork ? String(artwork.medium ?? "") : "";
  const selectedSubjectIds = new Set((artwork?.subjects ?? []).map(String));
  const selectedSeriesId = artwork?.series ? String(artwork.series) : "";

  return (
    <form action={action} className="flex flex-col gap-4">
      {artwork ? <input type="hidden" name="id" value={String(artwork._id)} /> : null}

      <Field label="Title">
        <input name="title" defaultValue={artwork?.title} required className={inputClass} />
      </Field>
      <input type="hidden" name="slug" defaultValue={artwork?.slug} />
      <Field label="Images">
        <ImageUploader
          name="images"
          folder="swati-portfolio/artworks"
          initial={artwork?.images ?? []}
          multiple
        />
      </Field>
      <Field label="Year">
        <input name="year" type="number" defaultValue={artwork?.year} className={inputClass} />
      </Field>
      <Field label="Medium">
        <Select name="medium" defaultValue={selectedMediumId} required>
          <option value="">Select a medium</option>
          {mediums.map((medium) => (
            <option key={String(medium._id)} value={String(medium._id)}>
              {medium.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Subjects">
        <div className="flex flex-wrap gap-3">
          {subjects.map((subject) => (
            <label key={String(subject._id)} className="flex items-center gap-1 text-sm text-foreground">
              <input
                type="checkbox"
                name="subjects"
                value={String(subject._id)}
                defaultChecked={selectedSubjectIds.has(String(subject._id))}
              />
              {subject.name}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Series (leave blank for standalone)">
        <Select name="series" defaultValue={selectedSeriesId}>
          <option value="">Standalone</option>
          {series.map((item) => (
            <option key={String(item._id)} value={String(item._id)}>
              {item.title}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-4 gap-3">
        <Field label="Height">
          <input name="height" type="number" step="0.1" defaultValue={artwork?.dimensions?.height} className={inputClass} />
        </Field>
        <Field label="Width">
          <input name="width" type="number" step="0.1" defaultValue={artwork?.dimensions?.width} className={inputClass} />
        </Field>
        <Field label="Depth">
          <input name="depth" type="number" step="0.1" defaultValue={artwork?.dimensions?.depth} className={inputClass} />
        </Field>
        <Field label="Unit">
          <Select name="unit" defaultValue={artwork?.dimensions?.unit ?? "cm"}>
            <option value="cm">cm</option>
            <option value="in">in</option>
          </Select>
        </Field>
      </div>

      <Field label="Description">
        <textarea name="description" defaultValue={artwork?.description} rows={4} className={inputClass} />
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={artwork?.status ?? "hidden"}>
          <option value="hidden">Hidden</option>
          <option value="published">Published</option>
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="featured" defaultChecked={artwork?.featured ?? false} />
        Featured on homepage
      </label>

      <div className="flex gap-3">
        <button type="submit" className={buttonClass}>
          Save
        </button>
        <Link href="/admin/artworks" className={secondaryButtonClass}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
