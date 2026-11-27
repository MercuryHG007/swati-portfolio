import { Button } from "@/components/button/button";

// Admin pages render inside the admin layout, so this keeps to the admin look rather than the public site.
export default function AdminNotFound() {
  return (
    <main className="flex flex-1 flex-col items-start gap-4 p-8">
      <span className="inline-flex w-fit items-center rounded-full border border-red-600 px-3 py-1 text-xs uppercase tracking-widest text-red-600">
        Error 404
      </span>
      <h1 className="text-2xl font-medium text-foreground">Nothing found here</h1>
      <p className="text-muted">This admin page doesn&apos;t exist, or it was deleted.</p>
      <Button href="/admin" size="sm">
        Back to dashboard
      </Button>
    </main>
  );
}
