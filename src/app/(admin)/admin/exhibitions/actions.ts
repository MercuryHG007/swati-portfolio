"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { Exhibition } from "@/models";
import { slugify } from "@/lib/slugify";
import { withAltFallback } from "@/lib/image-alt";
import { destroyCloudinaryAssets, removedPublicIds } from "@/lib/cloudinary-cleanup";
import { readImageList } from "@/lib/form-fields";

function refresh(slug?: string) {
  revalidatePath("/about");
  if (slug) revalidatePath(`/exhibitions/${slug}`);
}

function readFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase() || slugify(title);
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
  const { images, ...rest } = fields;
  const previous = await Exhibition.findByIdAndUpdate(id, {
    ...rest,
    ...(images !== undefined && { images }),
  }).lean<{ images?: { publicId: string }[] }>();
  if (images !== undefined) await destroyCloudinaryAssets(removedPublicIds(previous?.images ?? [], images));
  refresh(fields.slug);
  redirect("/admin/exhibitions?saved=1");
}

export async function deleteExhibition(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/exhibitions");

  await connectToDatabase();
  const deleted = await Exhibition.findByIdAndDelete(id).lean<{ images?: { publicId: string }[] }>();
  await destroyCloudinaryAssets((deleted?.images ?? []).map((img) => img.publicId));
  refresh();
  redirect("/admin/exhibitions?deleted=1");
}
