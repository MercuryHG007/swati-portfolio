import { findCurrentArtworkSlug, getCachedPortfolioArtwork } from "@/lib/queries";

// Public, read-only detail for one published work. Unknown slugs return 404; a renamed work's old slug
// permanently redirects to its current API URL.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artwork = await getCachedPortfolioArtwork(slug);
  if (!artwork) {
    const currentSlug = await findCurrentArtworkSlug(slug);
    if (currentSlug) return Response.redirect(new URL(`/api/portfolio/artworks/${currentSlug}`, request.url), 308);
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(artwork);
}
