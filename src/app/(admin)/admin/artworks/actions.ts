"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { Artwork, Exhibition } from "@/models";
import { slugify } from "@/lib/slugify";

function refresh(slug?: string) {
  revalidatePath("/");
  revalidatePath("/portfolio");
  if (slug) revalidatePath(`/artwork/${slug}`);
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
  const dateMadeRaw = String(formData.get("dateMade") ?? "");
  const dateMade = dateMadeRaw ? new Date(dateMadeRaw) : undefined;
  const medium = String(formData.get("medium") ?? "") || null;
  const subjects = formData.getAll("subjects").map(String).filter(Boolean);
  const seriesRaw = String(formData.get("series") ?? "");
  const series = seriesRaw || null;
  const description = String(formData.get("description") ?? "").trim();
  const status = formData.get("status") === "published" ? "published" : "hidden";
  const featured = formData.get("featured") === "on";
  const images = readImages(formData);
  const dimensions = {
    height: formData.get("height") ? Number(formData.get("height")) : undefined,
    width: formData.get("width") ? Number(formData.get("width")) : undefined,
    unit: formData.get("unit") === "in" ? "in" : "cm",
  };
  return { title, slug, dateMade, medium, subjects, series, description, status, featured, images, dimensions };
}

export async function createArtwork(formData: FormData) {
  await requireAdminSession();
  const fields = readFields(formData);
  if (!fields.title || !fields.slug || !fields.medium) redirect("/admin/artworks/new?error=invalid");

  await connectToDatabase();
  const order = await Artwork.countDocuments();
  const seriesOrder = fields.series ? await Artwork.countDocuments({ series: fields.series }) : 0;
  await Artwork.create({ ...fields, order, seriesOrder });
  refresh(fields.slug);
  redirect("/admin/artworks");
}

export async function updateArtwork(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  if (!id || !fields.title || !fields.slug || !fields.medium) {
    redirect(`/admin/artworks/${id}?error=invalid`);
  }

  await connectToDatabase();
  const existing = await Artwork.findById(id).lean<{ series?: unknown }>();
  // Moved into a different series (or into one for the first time) — append to the end of that series' order.
  const seriesOrder =
    fields.series && String(existing?.series ?? "") !== fields.series
      ? await Artwork.countDocuments({ series: fields.series })
      : undefined;
  await Artwork.findByIdAndUpdate(id, seriesOrder === undefined ? fields : { ...fields, seriesOrder });
  refresh(fields.slug);
  redirect("/admin/artworks");
}

export async function deleteArtwork(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/artworks");

  await connectToDatabase();
  await Exhibition.updateMany({ artworks: id }, { $pull: { artworks: id } });
  await Artwork.findByIdAndDelete(id);
  refresh();
  redirect("/admin/artworks");
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
}

