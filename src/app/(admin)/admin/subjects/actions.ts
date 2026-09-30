"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { Subject, Artwork } from "@/models";
import { slugify } from "@/lib/slugify";

function refresh() {
  revalidatePath("/admin/subjects");
  revalidatePath("/portfolio");
}

export async function createSubject(formData: FormData) {
  await requireAdminSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/subjects?error=invalid");

  await connectToDatabase();
  await Subject.create({ name, slug: slugify(name) });
  refresh();
  redirect("/admin/subjects");
}

export async function updateSubject(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) redirect("/admin/subjects?error=invalid");

  await connectToDatabase();
  await Subject.findByIdAndUpdate(id, { name, slug: slugify(name) });
  refresh();
  redirect("/admin/subjects");
}

export async function deleteSubject(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/subjects");

  await connectToDatabase();
  // Subjects are a tag-like taxonomy: unlink from artworks rather than blocking the delete.
  await Artwork.updateMany({ subjects: id }, { $pull: { subjects: id } });
  await Subject.findByIdAndDelete(id);
  refresh();
  redirect("/admin/subjects");
}
