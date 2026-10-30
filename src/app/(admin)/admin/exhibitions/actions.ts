"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { Exhibition } from "@/models";
import { slugify } from "@/lib/slugify";
import { withAltFallback } from "@/lib/image-alt";
import { destroyCloudinaryAssets, removedPublicIds } from "@/lib/cloudinary-cleanup";

function refresh(slug?: string) {
  revalidatePath("/exhibitions");
  if (slug) revalidatePath(`/exhibitions/${slug}`);
}

function readImages(formData: FormData) {
  const raw = String(formData.get("images") ?? "[]");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  const images = withAltFallback(readImages(formData), title);
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
  await Exhibition.create(fields);
  refresh(fields.slug);
  redirect("/admin/exhibitions");
}

export async function updateExhibition(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  if (!id || !fields.title || !fields.slug || !fields.venue || !fields.startDate) {
    redirect(`/admin/exhibitions/${id}?error=invalid`);
  }

  await connectToDatabase();
  const previous = await Exhibition.findByIdAndUpdate(id, fields).lean<{ images?: { publicId: string }[] }>();
  await destroyCloudinaryAssets(removedPublicIds(previous?.images ?? [], fields.images));
  refresh(fields.slug);
  redirect("/admin/exhibitions");
}

export async function deleteExhibition(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/exhibitions");

  await connectToDatabase();
  const deleted = await Exhibition.findByIdAndDelete(id).lean<{ images?: { publicId: string }[] }>();
  await destroyCloudinaryAssets((deleted?.images ?? []).map((img) => img.publicId));
  refresh();
  redirect("/admin/exhibitions");
}
