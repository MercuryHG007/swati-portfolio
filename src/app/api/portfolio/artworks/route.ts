import { getCachedPortfolioPage } from "@/lib/queries";
import { parsePortfolioFilters } from "@/lib/portfolio-filters";
import { dailySeed, parseSeed } from "@/lib/portfolio-order";

// Public, read-only listing of published works. Page size is fixed on the server.
// Order follows the day's seed unless a valid one is passed. Unknown values fall back to today, which keeps the cache bounded.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const seed = parseSeed(searchParams.get("seed")) ?? dailySeed();
  const result = await getCachedPortfolioPage(parsePortfolioFilters(searchParams), page, seed);
  return Response.json(result);
}
