"use server";

import { revalidatePath } from "next/cache";
import { scheduleSnapshotRefresh } from "@/lib/content-snapshot";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { Exhibition } from "@/models";
import { isSlugTaken, prepareSlugChange, slugForTitle } from "@/lib/slug-history";
import { withAltFallback } from "@/lib/image-alt";
import { destroyMediaAssets, removedPublicIds } from "@/lib/media-cleanup";
import { readImageList } from "@/lib/form-fields";

function refresh(slug?: string, previousSlug?: string) {
  scheduleSnapshotRefresh();
  revalidatePath("/about");
  if (slug) revalidatePath(`/exhibitions/${slug}`);
  if (previousSlug) revalidatePath(`/exhibitions/${previousSlug}`);
}

function readFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = slugForTitle(title);
  const venue = String(formData.get("venue") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const type = formData.get("type") === "solo" ? "solo" : "group";
  const startDateRaw = String(formData.get("startDate") ?? "");
  const endDateRaw = String(formData.get("endDate") ?? "");
  const startDate = startDateRaw ? new Date(startDateRaw) : undefined;
  const endDate = endDateRaw ? new Date(endDateRaw) : undefined;
  const description = String(formData.get("description") ?? "").trim();
  const status = formData.get("status") === "published" ? "published" : "hidden";
  // undefined when the form didn't send the field: the stored images are then left alone.
  const submittedImages = readImageList(formData, "images");
  const images = submittedImages && withAltFallback(submittedImages, title);
  const artworks = formData.getAll("artworks").map(String).filter(Boolean);
  return { title, slug, venue, city, country, type, startDate, endDate, description, status, images, artworks };
}

export async function createExhibition(formData: FormData) {
  await requireAdminSession();
  const fields = readFields(formData);
  if (!fields.title || !fields.slug || !fields.venue || !fields.startDate) {
    redirect("/admin/exhibitions/new?error=invalid");
  }

  await connectToDatabase();
  if (await isSlugTaken(Exhibition, fields.slug)) redirect("/admin/exhibitions/new?error=slug-taken");
  await Exhibition.create({ ...fields, images: fields.images ?? [] });
  refresh(fields.slug);
  redirect("/admin/exhibitions?saved=1");
}

export async function updateExhibition(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  if (!id || !fields.title || !fields.slug || !fields.venue || !fields.startDate) {
    redirect(`/admin/exhibitions/${id}?error=invalid`);
  }

  await connectToDatabase();
  if (await isSlugTaken(Exhibition, fields.slug, id)) redirect(`/admin/exhibitions/${id}?error=slug-taken`);
  const { images, ...rest } = fields;
  const previous = await Exhibition.findById(id).lean<{ slug?: string; images?: { publicId: string }[] }>();
  const slugUpdate = await prepareSlugChange(Exhibition, previous?.slug, fields.slug);
  await Exhibition.findByIdAndUpdate(id, {
    ...rest,
    ...(images !== undefined && { images }),
    ...slugUpdate,
  });
  if (images !== undefined) await destroyMediaAssets(removedPublicIds(previous?.images ?? [], images));
  refresh(fields.slug, previous?.slug);
  redirect("/admin/exhibitions?saved=1");
}

export async function deleteExhibition(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/exhibitions");

  await connectToDatabase();
  const deleted = await Exhibition.findByIdAndDelete(id).lean<{ images?: { publicId: string }[] }>();
  await destroyMediaAssets((deleted?.images ?? []).map((img) => img.publicId));
  refresh();
  redirect("/admin/exhibitions?deleted=1");
}
