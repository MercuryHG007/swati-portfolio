import { ImageUploader } from "@/components/admin/image-uploader";
import { Field, inputClass, buttonClass, secondaryButtonClass } from "@/components/admin/ui";
import Link from "next/link";

export function SeriesForm({
  series,
  action,
}: {
  series?: {
    _id: unknown;
    title: string;
    slug: string;
    description: string;
    coverImage: { publicId: string; width: number; height: number; alt: string } | null;
    order: number;
    status: string;
  };
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      {series ? <input type="hidden" name="id" value={String(series._id)} /> : null}

      <Field label="Title">
        <input name="title" defaultValue={series?.title} required className={inputClass} />
      </Field>
      <Field label="Slug (leave blank to auto-generate from title)">
        <input name="slug" defaultValue={series?.slug} className={inputClass} />
      </Field>
      <Field label="Description">
        <textarea name="description" defaultValue={series?.description} rows={4} className={inputClass} />
      </Field>
      <Field label="Cover image">
        <ImageUploader
          name="coverImage"
          folder="swati-portfolio/series"
          initial={series?.coverImage ? [series.coverImage] : []}
        />
      </Field>
      <Field label="Order (lower shows first)">
        <input name="order" type="number" defaultValue={series?.order ?? 0} className={inputClass} />
      </Field>
      <Field label="Status">
        <select name="status" defaultValue={series?.status ?? "hidden"} className={inputClass}>
          <option value="hidden">Hidden</option>
          <option value="published">Published</option>
        </select>
      </Field>

      <div className="flex gap-3">
        <button type="submit" className={buttonClass}>
          Save
        </button>
        <Link href="/admin/series" className={secondaryButtonClass}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
