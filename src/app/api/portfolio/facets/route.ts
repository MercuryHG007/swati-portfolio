import { getCachedPortfolioFacets } from "@/lib/queries";
import { parsePortfolioFilters } from "@/lib/portfolio-filters";

// Option counts for the current filter selection. Public and read-only, like the artworks endpoint.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return Response.json(await getCachedPortfolioFacets(parsePortfolioFilters(searchParams)));
}
