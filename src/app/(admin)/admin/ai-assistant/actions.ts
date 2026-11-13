"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { draftStyleGuide, saveStyleGuide } from "@/lib/artist-voice";
import { STYLE_GUIDE_MAX_LENGTH } from "@/models/ArtworkAssistSettings";

export async function updateStyleGuide(formData: FormData) {
  await requireAdminSession();
  const styleGuide = String(formData.get("styleGuide") ?? "").trim().slice(0, STYLE_GUIDE_MAX_LENGTH);
  await saveStyleGuide(styleGuide);
  redirect("/admin/ai-assistant?saved=1");
}

export async function draftStyleGuideFromWork() {
  await requireAdminSession();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) redirect("/admin/ai-assistant?error=not-configured");

  let guide: string | null;
  try {
    guide = await draftStyleGuide(apiKey);
  } catch (error) {
    console.error("Style guide draft failed:", error instanceof Error ? error.message : error);
    redirect("/admin/ai-assistant?error=draft-failed");
  }
  if (!guide) redirect("/admin/ai-assistant?error=too-few");

  await saveStyleGuide(guide);
  redirect("/admin/ai-assistant?drafted=1");
}
