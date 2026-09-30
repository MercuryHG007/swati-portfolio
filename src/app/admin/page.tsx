import { auth, signOut } from "@/auth";

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold text-foreground">Admin dashboard</h1>
      <p className="text-muted">Signed in as {session?.user?.email}.</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/login" });
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-2 text-foreground"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
