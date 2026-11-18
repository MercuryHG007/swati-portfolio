import { getCachedPortfolioSubjects } from "@/lib/queries";

// Public, read-only list of subjects that have at least one published work. Matches the portfolio filters.
export async function GET() {
  return Response.json(await getCachedPortfolioSubjects());
}
