import { ImageUploader } from "@/components/admin/image-uploader";
import { Field, Select, inputClass, buttonClass, secondaryButtonClass } from "@/components/admin/ui";
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
      <input type="hidden" name="slug" defaultValue={series?.slug} />
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
      <Field label="Status">
        <Select name="status" defaultValue={series?.status ?? "hidden"}>
          <option value="hidden">Hidden</option>
          <option value="published">Published</option>
        </Select>
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
