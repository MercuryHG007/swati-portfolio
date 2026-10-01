"use server";

import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { requireAdminSession } from "@/lib/require-admin";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUser } from "@/models";
import { unstable_update } from "@/auth";

const MIN_PASSWORD_LENGTH = 8;

export async function changePassword(formData: FormData) {
  const session = await requireAdminSession();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    redirect("/admin/account?error=short");
  }
  if (newPassword !== confirmPassword) {
    redirect("/admin/account?error=mismatch");
  }

  await connectToDatabase();
  const user = await AdminUser.findById(session.user.id);
  if (!user) throw new Error("Unauthorized");

  const isValid = await compare(currentPassword, user.passwordHash);
  if (!isValid) {
    redirect("/admin/account?error=wrong");
  }

  user.passwordHash = await hash(newPassword, 12);
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  // Keep this device's session valid; other devices carry the old tokenVersion and
  // get signed out the next time their JWT is re-validated (see src/auth.ts jwt callback).
  await unstable_update({ user: { tokenVersion: user.tokenVersion } });

  redirect("/admin/account?saved=1");
}
