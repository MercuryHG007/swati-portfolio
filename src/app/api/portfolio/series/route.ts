import { getCachedPortfolioSeries } from "@/lib/queries";

// Public, read-only list of published series, in the same order as the series page.
export async function GET() {
  return Response.json(await getCachedPortfolioSeries());
}
