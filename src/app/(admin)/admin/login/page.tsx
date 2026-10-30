import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default function AdminLoginPage() {
  async function authenticate(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/admin/login?error=1");
      }
      throw err; // rethrow Next.js's internal redirect signal (and any other error)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <ToastOnLoad configs={[{ param: "error", type: "error", message: "Invalid email or password." }]} />
      <h1 className="text-2xl font-semibold text-foreground">Admin sign in</h1>
      <form action={authenticate} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-accent-foreground"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
