import { notFound, redirect } from "next/navigation";
import { getMediumBySlug } from "@/lib/queries";

// Old per-medium URL. The filter now lives on /portfolio, so keep existing links working.
export default async function MediumRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const medium = await getMediumBySlug(slug);
  if (!medium) notFound();
  redirect(`/portfolio?medium=${encodeURIComponent(medium.slug)}#portfolio`);
}
