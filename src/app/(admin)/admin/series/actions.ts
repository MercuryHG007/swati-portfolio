"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { PORTFOLIO_CACHE_TAG } from "@/lib/queries";
import { connectToDatabase } from "@/lib/mongodb";
import { Series, Artwork, SeriesSettings } from "@/models";
import { SERIES_SETTINGS_DEFAULTS } from "@/models/SeriesSettings";
import { slugify } from "@/lib/slugify";
import { withAltFallback, withSuggestedAlt } from "@/lib/image-alt";
import { destroyCloudinaryAssets, removedPublicIds } from "@/lib/cloudinary-cleanup";
import { readSingleImage } from "@/lib/form-fields";

function refresh(slug?: string) {
  revalidatePath("/admin/series");
  revalidatePath("/portfolio");
  updateTag(PORTFOLIO_CACHE_TAG);
  revalidatePath("/series");
  if (slug) revalidatePath(`/portfolio/series/${slug}`);
}

function readFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase() || slugify(title);
  const description = String(formData.get("description") ?? "").trim();
  const status = formData.get("status") === "published" ? "published" : "hidden";
  const featured = formData.get("featured") === "on";
  // null clears the cover; undefined means the form didn't send it and the stored cover is left alone.
  const coverImageRaw = readSingleImage(formData, "coverImage");
  const aiAltText = String(formData.get("aiAltText") ?? "").trim().slice(0, 200);
  const coverImage = coverImageRaw
    ? withAltFallback(withSuggestedAlt([coverImageRaw], aiAltText), title)[0]
    : coverImageRaw;
  return { title, slug, description, status, featured, coverImage };
}

export async function createSeries(formData: FormData) {
  await requireAdminSession();
  const fields = readFields(formData);
  if (!fields.title || !fields.slug) redirect("/admin/series/new?error=invalid");

  await connectToDatabase();
  const order = await Series.countDocuments();
  await Series.create({ ...fields, coverImage: fields.coverImage ?? null, order });
  refresh(fields.slug);
  redirect("/admin/series?saved=1");
}

export async function updateSeries(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  if (!id || !fields.title || !fields.slug) redirect(`/admin/series/${id}?error=invalid`);

  await connectToDatabase();
  const { coverImage, ...rest } = fields;
  const previous = await Series.findByIdAndUpdate(id, {
    ...rest,
    ...(coverImage !== undefined && { coverImage }),
  }).lean<{ coverImage?: { publicId: string } }>();
  if (coverImage !== undefined) {
    await destroyCloudinaryAssets(
      removedPublicIds(previous?.coverImage ? [previous.coverImage] : [], coverImage ? [coverImage] : [])
    );
  }
  refresh(fields.slug);
  redirect("/admin/series?saved=1");
}

export async function deleteSeries(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/series");

  await connectToDatabase();
  // A series is an optional grouping — unlink its artworks (make them standalone) instead of blocking.
  await Artwork.updateMany({ series: id }, { series: null });
  const deleted = await Series.findByIdAndDelete(id).lean<{ coverImage?: { publicId: string } }>();
  await destroyCloudinaryAssets(deleted?.coverImage ? [deleted.coverImage.publicId] : []);
  refresh();
  redirect("/admin/series?deleted=1");
}

export async function reorderSeries(orderedIds: string[]) {
  await requireAdminSession();
  await connectToDatabase();
  await Promise.all(orderedIds.map((id, index) => Series.updateOne({ _id: id }, { order: index })));
  refresh();
}

// Singleton text for the portfolio carousel. Blank heading or button text falls back to the defaults.
export async function updateSeriesSettings(formData: FormData) {
  await requireAdminSession();
  const heading = String(formData.get("heading") ?? "").trim().slice(0, 100) || SERIES_SETTINGS_DEFAULTS.heading;
  const body = String(formData.get("body") ?? "").trim().slice(0, 400);
  const ctaLabel = String(formData.get("ctaLabel") ?? "").trim().slice(0, 40) || SERIES_SETTINGS_DEFAULTS.ctaLabel;

  await connectToDatabase();
  await SeriesSettings.findOneAndUpdate({}, { heading, body, ctaLabel }, { upsert: true });
  revalidatePath("/portfolio");
  updateTag(PORTFOLIO_CACHE_TAG);
  revalidatePath("/admin/series");
  redirect("/admin/series?saved=1");
}

