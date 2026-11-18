import { getCachedPortfolioArtwork } from "@/lib/queries";

// Public, read-only detail for one published work. Unpublished or unknown slugs return 404.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artwork = await getCachedPortfolioArtwork(slug);
  if (!artwork) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(artwork);
}
