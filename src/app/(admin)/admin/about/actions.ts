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

// Rows arrive as a JSON hidden field from CvRowsField. Blank rows are dropped and fields trimmed.
function readCvRows(formData: FormData, name: string) {
  const raw = String(formData.get(name) ?? "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((row) => {
      const entry = (row ?? {}) as Record<string, unknown>;
      return {
        title: String(entry.title ?? "").trim().slice(0, 300),
        detail: String(entry.detail ?? "").trim().slice(0, 300),
        date: String(entry.date ?? "").trim().slice(0, 100),
      };
    })
    .filter((row) => row.title);
}

export async function updateAbout(formData: FormData) {
  await requireAdminSession();

  const bio = String(formData.get("bio") ?? "").trim();
  const statement = String(formData.get("statement") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const resumeUrl = String(formData.get("resumeUrl") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();
  const education = readCvRows(formData, "education");
  const awards = readCvRows(formData, "awards");
  const achievements = readCvRows(formData, "achievements");
  const publicCollections = String(formData.get("publicCollections") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const photo = readImage(formData);

  await connectToDatabase();
  const previous = await About.findOneAndUpdate(
    {},
    {
      bio,
      statement,
      location,
      resumeUrl,
      contactEmail,
      photo,
      socials: { instagram },
      education,
      awards,
      achievements,
      publicCollections,
    },
    { upsert: true }
  ).lean<{ photo?: { publicId: string } }>();
  await destroyCloudinaryAssets(removedPublicIds(previous?.photo ? [previous.photo] : [], photo ? [photo] : []));

  revalidatePath("/", "layout");
  redirect("/admin/about?saved=1");
}
