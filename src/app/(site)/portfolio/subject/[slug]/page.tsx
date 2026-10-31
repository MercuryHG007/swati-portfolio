import { notFound, redirect } from "next/navigation";
import { getSubjectBySlug } from "@/lib/queries";

// Old per-subject URL. The filter now lives on /portfolio, so keep existing links working.
export default async function SubjectRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const subject = await getSubjectBySlug(slug);
  if (!subject) notFound();
  redirect(`/portfolio?subject=${encodeURIComponent(subject.slug)}#portfolio`);
}
