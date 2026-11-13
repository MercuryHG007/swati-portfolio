"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { HomeSettings } from "@/models";
import { HOME_SETTINGS_DEFAULTS } from "@/models/HomeSettings";

// Blank fields fall back to the defaults, so the home page never renders an empty heading or button.
export async function updateHomeSettings(formData: FormData) {
  await requireAdminSession();

  const field = (name: keyof typeof HOME_SETTINGS_DEFAULTS, max: number) =>
    String(formData.get(name) ?? "").trim().slice(0, max) || HOME_SETTINGS_DEFAULTS[name];

  const settings = {
    heroHeading: field("heroHeading", 200),
    heroButtonLabel: field("heroButtonLabel", 40),
    featuredLabel: field("featuredLabel", 60),
    mediumsLabel: field("mediumsLabel", 60),
    commissionsHeading: field("commissionsHeading", 200),
  };

  await connectToDatabase();
  await HomeSettings.findOneAndUpdate({}, settings, { upsert: true });
  revalidatePath("/", "layout");
  redirect("/admin/home?saved=1");
}
