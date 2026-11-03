"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { ContactMessage } from "@/models";

export async function markMessageRead(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await connectToDatabase();
  await ContactMessage.findByIdAndUpdate(id, { readAt: new Date() });
  revalidatePath("/admin/messages");
  redirect("/admin/messages?marked=1");
}

export async function deleteMessage(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await connectToDatabase();
  await ContactMessage.findByIdAndDelete(id);
  revalidatePath("/admin/messages");
  redirect("/admin/messages?deleted=1");
}
