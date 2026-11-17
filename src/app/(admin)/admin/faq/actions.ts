"use server";

import { revalidatePath } from "next/cache";
import { scheduleSnapshotRefresh } from "@/lib/content-snapshot";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { getAbout, getMediumsWithWork } from "@/lib/queries";
import { buildStarterFaqs } from "@/lib/faq-starter";
import { Faq } from "@/models";

function refresh() {
  scheduleSnapshotRefresh();
  revalidatePath("/faq");
  revalidatePath("/admin/faq");
}

// Adds the starter questions only when the list is empty, so it can't duplicate what the artist has edited.
export async function seedStarterFaqs() {
  await requireAdminSession();
  await connectToDatabase();
  if ((await Faq.countDocuments()) > 0) redirect("/admin/faq");

  const [about, mediums] = await Promise.all([getAbout(), getMediumsWithWork()]);
  const starters = buildStarterFaqs({
    location: about?.location,
    mediumNames: mediums.map((medium) => medium.name),
    education: about?.education ?? [],
    contactEmail: about?.contactEmail,
  });
  await Faq.insertMany(starters.map((item, index) => ({ ...item, order: index + 1, status: "published" })));
  refresh();
  redirect("/admin/faq?saved=1");
}

function readFields(formData: FormData) {
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const orderValue = Number(formData.get("order") ?? 0);
  const order = Number.isFinite(orderValue) ? orderValue : 0;
  const status = formData.get("status") === "published" ? "published" : "hidden";
  return { question, answer, order, status };
}

export async function createFaq(formData: FormData) {
  await requireAdminSession();
  const fields = readFields(formData);
  if (!fields.question || !fields.answer) redirect("/admin/faq?error=invalid");

  await connectToDatabase();
  await Faq.create(fields);
  refresh();
  redirect("/admin/faq?saved=1");
}

export async function updateFaq(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  if (!id || !fields.question || !fields.answer) redirect("/admin/faq?error=invalid");

  await connectToDatabase();
  await Faq.findByIdAndUpdate(id, fields);
  refresh();
  redirect("/admin/faq?saved=1");
}

export async function deleteFaq(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/faq");

  await connectToDatabase();
  await Faq.findByIdAndDelete(id);
  refresh();
  redirect("/admin/faq?deleted=1");
}
