import { auth } from "@/auth";

// Defense in depth: proxy.ts already blocks unauthenticated page loads under
// /admin, but Server Actions can be invoked directly, so each one re-checks.
export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}
