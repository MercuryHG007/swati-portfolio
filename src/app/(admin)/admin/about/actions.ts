"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { About } from "@/models";
import { destroyCloudinaryAssets, removedPublicIds } from "@/lib/cloudinary-cleanup";

function readImage(formData: FormData) {
  const raw = String(formData.get("photo") ?? "null");
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function updateAbout(formData: FormData) {
  await requireAdminSession();

  const bio = String(formData.get("bio") ?? "").trim();
  const statement = String(formData.get("statement") ?? "").trim();
  const resumeUrl = String(formData.get("resumeUrl") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();
  const photo = readImage(formData);

  await connectToDatabase();
  const previous = await About.findOneAndUpdate(
    {},
    { bio, statement, resumeUrl, contactEmail, photo, socials: { instagram } },
    { upsert: true }
  ).lean<{ photo?: { publicId: string } }>();
  await destroyCloudinaryAssets(removedPublicIds(previous?.photo ? [previous.photo] : [], photo ? [photo] : []));

  revalidatePath("/about");
  revalidatePath("/contact");
  redirect("/admin/about?saved=1");
}
