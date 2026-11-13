import { auth } from "@/auth";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";

// Sticky beneath the header. Hidden below lg, where the hamburger drawer takes over.
export async function AdminSidebar() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <aside className="sticky top-(--header-height) hidden h-[calc(100dvh-var(--header-height))] w-56 shrink-0 self-start overflow-y-auto border-r border-border px-4 py-6 lg:block">
      <AdminNavLinks />
    </aside>
  );
}
