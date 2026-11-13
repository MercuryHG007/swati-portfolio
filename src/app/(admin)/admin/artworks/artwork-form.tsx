import Link from "next/link";
import { getAllMediums, getAllSubjects, getAllSeries } from "@/lib/admin-queries";
import { ImageUploader } from "@/components/admin/image-uploader";
import { AiArtworkAssist, AiSeriesNote } from "@/components/admin/ai-artwork-assist";
import { AiArtworkProvider } from "@/components/admin/ai-artwork-context";
import { NewSubjectsField } from "@/components/admin/ai-artwork-subjects";
import { Field, FieldSet, Select, inputClass, buttonClass, secondaryButtonClass } from "@/components/admin/ui";

function toDateInputValue(date?: Date | string) {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toISOString().slice(0, 10);
}

export async function ArtworkForm({
  artwork,
  action,
}: {
  artwork?: {
    _id: unknown;
    title: string;
    slug: string;
    images: { publicId: string; width: number; height: number; alt: string }[];
    dateMade?: Date | string;
    medium: unknown;
    subjects: unknown[];
    series: unknown;
    dimensions?: { height?: number; width?: number; unit?: string };
    description: string;
    status: string;
    availability?: string | null;
    featured: boolean;
  };
  action: (formData: FormData) => void;
}) {
  const [mediums, subjects, series] = await Promise.all([getAllMediums(), getAllSubjects(), getAllSeries()]);

  const selectedMediumId = artwork ? String(artwork.medium ?? "") : "";
  const selectedSubjectIds = new Set((artwork?.subjects ?? []).map(String));
  const selectedSeriesId = artwork?.series ? String(artwork.series) : "";

  const form = (
    <form action={action} className="flex flex-col gap-4">
      {artwork ? <input type="hidden" name="id" value={String(artwork._id)} /> : null}
      <FieldSet label="Images">
        <ImageUploader
          name="images"
          folder="swati-portfolio/artworks"
          initial={artwork?.images ?? []}
          multiple
        />
      </FieldSet>
      <AiArtworkAssist
        mediums={mediums.map((medium) => ({ id: String(medium._id), name: medium.name }))}
        subjects={subjects.map((subject) => ({ id: String(subject._id), name: subject.name }))}
      />
      <Field label="Title">
        <input name="title" defaultValue={artwork?.title} required className={inputClass} />
      </Field>
      <input type="hidden" name="slug" defaultValue={artwork?.slug} />
      <Field label="Date made">
        <input
          name="dateMade"
          type="date"
          defaultValue={toDateInputValue(artwork?.dateMade)}
          className={inputClass}
        />
      </Field>
      <Field label="Description">
        <textarea name="description" defaultValue={artwork?.description} rows={4} className={inputClass} />
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
      <FieldSet label="Subjects">
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
      </FieldSet>
      <NewSubjectsField subjects={subjects.map((subject) => ({ id: String(subject._id), name: subject.name }))} />
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
      <AiSeriesNote />

      <FieldSet label="Dimensions">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Height">
            <input name="height" type="number" step="0.1" defaultValue={artwork?.dimensions?.height} className={inputClass} />
          </Field>
          <Field label="Width">
            <input name="width" type="number" step="0.1" defaultValue={artwork?.dimensions?.width} className={inputClass} />
          </Field>
          <Field label="Unit">
            <Select name="unit" defaultValue={artwork?.dimensions?.unit ?? "cm"}>
              <option value="cm">cm</option>
              <option value="in">in</option>
            </Select>
          </Field>
        </div>
      </FieldSet>

      <FieldSet label="Publishing">
        <Field label="Status">
          <Select name="status" defaultValue={artwork?.status ?? "hidden"}>
            <option value="hidden">Hidden</option>
            <option value="published">Published</option>
          </Select>
        </Field>
        <Field label="Availability">
          <Select name="availability" defaultValue={artwork?.availability ?? ""}>
            <option value="">Not set (visitors are invited to enquire)</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
          </Select>
        </Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="featured" defaultChecked={artwork?.featured ?? false} />
          Featured on homepage
        </label>
      </FieldSet>

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

  return <AiArtworkProvider>{form}</AiArtworkProvider>;
}
