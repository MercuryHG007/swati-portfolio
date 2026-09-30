"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { Series, Artwork } from "@/models";
import { slugify } from "@/lib/slugify";

function refresh(slug?: string) {
  revalidatePath("/admin/series");
  revalidatePath("/portfolio");
  if (slug) revalidatePath(`/portfolio/series/${slug}`);
}

function readImage(formData: FormData) {
  const raw = String(formData.get("coverImage") ?? "null");
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase() || slugify(title);
  const description = String(formData.get("description") ?? "").trim();
  const order = Number(formData.get("order") ?? 0) || 0;
  const status = formData.get("status") === "published" ? "published" : "hidden";
  const coverImage = readImage(formData);
  return { title, slug, description, order, status, coverImage };
}

export async function createSeries(formData: FormData) {
  await requireAdminSession();
  const fields = readFields(formData);
  if (!fields.title || !fields.slug) redirect("/admin/series/new?error=invalid");

  await connectToDatabase();
  await Series.create(fields);
  refresh(fields.slug);
  redirect("/admin/series");
}

export async function updateSeries(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  if (!id || !fields.title || !fields.slug) redirect(`/admin/series/${id}?error=invalid`);

  await connectToDatabase();
  await Series.findByIdAndUpdate(id, fields);
  refresh(fields.slug);
  redirect("/admin/series");
}

export async function deleteSeries(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/series");

  await connectToDatabase();
  // A series is an optional grouping — unlink its artworks (make them standalone) instead of blocking.
  await Artwork.updateMany({ series: id }, { series: null });
  await Series.findByIdAndDelete(id);
  refresh();
  redirect("/admin/series");
}
