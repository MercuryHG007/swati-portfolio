import { API_CATALOG_MEDIA_TYPE, apiCatalog } from "@/lib/api-catalog";

// Rendered per request so the links follow the deployment's domain without a stale cached copy.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(JSON.stringify(apiCatalog()), {
    headers: { "Content-Type": API_CATALOG_MEDIA_TYPE },
  });
}
