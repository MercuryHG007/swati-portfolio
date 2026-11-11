"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { PORTFOLIO_CACHE_TAG } from "@/lib/queries";
import { connectToDatabase } from "@/lib/mongodb";
import { Artwork, Exhibition, Subject } from "@/models";
import { AVAILABILITY_STATUS } from "@/models/shared";
import { slugify } from "@/lib/slugify";
import { normalizeSubjectName } from "@/lib/subject-names";
import { withAltFallback, withSuggestedAlt } from "@/lib/image-alt";
import { destroyCloudinaryAssets, removedPublicIds } from "@/lib/cloudinary-cleanup";
import { readImageList } from "@/lib/form-fields";

function refresh(slug?: string) {
  revalidatePath("/");
  revalidatePath("/portfolio");
  updateTag(PORTFOLIO_CACHE_TAG);
  if (slug) revalidatePath(`/artwork/${slug}`);
}

function readFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase() || slugify(title);
  const dateMadeRaw = String(formData.get("dateMade") ?? "");
  const dateMade = dateMadeRaw ? new Date(dateMadeRaw) : undefined;
  const medium = String(formData.get("medium") ?? "") || null;
  const subjects = formData.getAll("subjects").map(String).filter(Boolean);
  const seriesRaw = String(formData.get("series") ?? "");
  const series = seriesRaw || null;
  const description = String(formData.get("description") ?? "").trim();
  const aiAltText = String(formData.get("aiAltText") ?? "").trim().slice(0, 200);
  const status = formData.get("status") === "published" ? "published" : "hidden";
  const availabilityRaw = String(formData.get("availability") ?? "");
  const availability = AVAILABILITY_STATUS.find((value) => value === availabilityRaw) ?? null;
  const featured = formData.get("featured") === "on";
  // undefined when the form didn't send the field: the stored images are then left alone.
  const submittedImages = readImageList(formData, "images");
  const images = submittedImages && withAltFallback(withSuggestedAlt(submittedImages, aiAltText), title);
  const dimensions = {
    height: formData.get("height") ? Number(formData.get("height")) : undefined,
    width: formData.get("width") ? Number(formData.get("width")) : undefined,
    unit: formData.get("unit") === "in" ? "in" : "cm",
  };
  return { title, slug, dateMade, medium, subjects, series, description, status, availability, featured, images, dimensions };
}

function readNewSubjects(formData: FormData): string[] {
  return formData
    .getAll("newSubjects")
    .slice(0, 20)
    .map((value) => normalizeSubjectName(String(value)))
    .filter(Boolean);
}

// Creates any ticked new subjects and returns the ids to attach. The upsert on slug reuses a subject
// that already exists under the same name, so a repeat or a case-only difference creates nothing.
async function resolveSubjectIds(existingIds: string[], newNames: string[]): Promise<string[]> {
  const createdIds: string[] = [];
  for (const name of newNames) {
    const slug = slugify(name);
    if (!slug) continue;
    const subject = await Subject.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name, slug } },
      { upsert: true, new: true },
    ).lean<{ _id: unknown }>();
    if (subject) createdIds.push(String(subject._id));
  }
  if (createdIds.length) revalidatePath("/admin/subjects");
  return [...new Set([...existingIds, ...createdIds])];
}

export async function createArtwork(formData: FormData) {
  await requireAdminSession();
  const fields = readFields(formData);
  if (!fields.title || !fields.slug || !fields.medium) redirect("/admin/artworks/new?error=invalid");

  await connectToDatabase();
  const subjects = await resolveSubjectIds(fields.subjects, readNewSubjects(formData));
  const order = await Artwork.countDocuments();
  const seriesOrder = fields.series ? await Artwork.countDocuments({ series: fields.series }) : 0;
  await Artwork.create({ ...fields, subjects, images: fields.images ?? [], order, seriesOrder });
  refresh(fields.slug);
  redirect("/admin/artworks?saved=1");
}

export async function updateArtwork(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  if (!id || !fields.title || !fields.slug || !fields.medium) {
    redirect(`/admin/artworks/${id}?error=invalid`);
  }

  await connectToDatabase();
  const existing = await Artwork.findById(id).lean<{ series?: unknown; images?: { publicId: string }[] }>();
  // Moved into a different series (or into one for the first time) — append to the end of that series' order.
  const seriesOrder =
    fields.series && String(existing?.series ?? "") !== fields.series
      ? await Artwork.countDocuments({ series: fields.series })
      : undefined;
  const subjects = await resolveSubjectIds(fields.subjects, readNewSubjects(formData));
  const { images, ...rest } = fields;
  await Artwork.findByIdAndUpdate(id, {
    ...rest,
    subjects,
    ...(images !== undefined && { images }),
    ...(seriesOrder !== undefined && { seriesOrder }),
  });
  if (images !== undefined) await destroyCloudinaryAssets(removedPublicIds(existing?.images ?? [], images));
  refresh(fields.slug);
  redirect("/admin/artworks?saved=1");
}

export async function deleteArtwork(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/artworks");

  await connectToDatabase();
  await Exhibition.updateMany({ artworks: id }, { $pull: { artworks: id } });
  const deleted = await Artwork.findByIdAndDelete(id).lean<{ images?: { publicId: string }[] }>();
  await destroyCloudinaryAssets((deleted?.images ?? []).map((img) => img.publicId));
  refresh();
  redirect("/admin/artworks?deleted=1");
}

export async function reorderArtworksInSeries(seriesId: string, orderedIds: string[]) {
  await requireAdminSession();
  await connectToDatabase();
  await Promise.all(
    orderedIds.map((id, index) =>
      Artwork.updateOne({ _id: id, series: seriesId }, { seriesOrder: index })
    )
  );
  revalidatePath(`/admin/series/${seriesId}`);
  revalidatePath("/portfolio");
  updateTag(PORTFOLIO_CACHE_TAG);
}

