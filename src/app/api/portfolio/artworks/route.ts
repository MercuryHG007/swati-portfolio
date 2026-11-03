import { getCachedPortfolioPage } from "@/lib/queries";
import { parsePortfolioFilters } from "@/lib/portfolio-filters";

// Public, read-only listing of published works. Page size is fixed on the server.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const result = await getCachedPortfolioPage(parsePortfolioFilters(searchParams), page);
  return Response.json(result);
}
