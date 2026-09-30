"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { Medium, Artwork } from "@/models";
import { slugify } from "@/lib/slugify";

function refresh() {
  revalidatePath("/admin/mediums");
  revalidatePath("/portfolio");
}

export async function createMedium(formData: FormData) {
  await requireAdminSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/mediums?error=invalid");

  await connectToDatabase();
  await Medium.create({ name, slug: slugify(name) });
  refresh();
  redirect("/admin/mediums");
}

export async function updateMedium(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) redirect("/admin/mediums?error=invalid");

  await connectToDatabase();
  await Medium.findByIdAndUpdate(id, { name, slug: slugify(name) });
  refresh();
  redirect("/admin/mediums");
}

export async function deleteMedium(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/mediums");

  await connectToDatabase();
  const inUse = await Artwork.exists({ medium: id });
  if (inUse) redirect("/admin/mediums?error=in_use");

  await Medium.findByIdAndDelete(id);
  refresh();
  redirect("/admin/mediums");
}
