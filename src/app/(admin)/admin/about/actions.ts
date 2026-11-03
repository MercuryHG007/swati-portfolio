"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { About } from "@/models";
import { destroyCloudinaryAssets, removedPublicIds } from "@/lib/cloudinary-cleanup";
import { readCvRows, readSingleImage } from "@/lib/form-fields";

// Only fields the form actually submitted are written. A missing field means "leave it as it is",
// not "empty it" (see lib/form-fields.ts).
export async function updateAbout(formData: FormData) {
  await requireAdminSession();

  const text = (name: string) => (formData.has(name) ? String(formData.get(name) ?? "").trim() : undefined);
  const photo = readSingleImage(formData, "photo");
  const footerLogo = readSingleImage(formData, "footerLogo");
  const publicCollections = formData.has("publicCollections")
    ? String(formData.get("publicCollections") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : undefined;

  const candidates: Record<string, unknown> = {
    bio: text("bio"),
    statement: text("statement"),
    location: text("location"),
    resumeUrl: text("resumeUrl"),
    contactEmail: text("contactEmail"),
    "socials.instagram": text("instagram"),
    photo,
    footerLogo,
    education: readCvRows(formData, "education"),
    awards: readCvRows(formData, "awards"),
    achievements: readCvRows(formData, "achievements"),
    publicCollections,
  };
  const update = Object.fromEntries(Object.entries(candidates).filter(([, value]) => value !== undefined));

  await connectToDatabase();
  const previous = await About.findOneAndUpdate({}, update, { upsert: true }).lean<{
    photo?: { publicId: string } | null;
    footerLogo?: { publicId: string } | null;
  }>();

  // An image the form didn't submit keeps its stored value, so it is never counted as removed.
  const finalPhoto = photo !== undefined ? photo : previous?.photo;
  const finalFooterLogo = footerLogo !== undefined ? footerLogo : previous?.footerLogo;
  await destroyCloudinaryAssets(
    removedPublicIds([previous?.photo, previous?.footerLogo], [finalPhoto, finalFooterLogo])
  );

  revalidatePath("/", "layout");
  redirect("/admin/about?saved=1");
}
