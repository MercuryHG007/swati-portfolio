import { getCachedPortfolioMediums } from "@/lib/queries";

// Public, read-only list of mediums that have at least one published work. Matches the portfolio filters.
export async function GET() {
  return Response.json(await getCachedPortfolioMediums());
}
