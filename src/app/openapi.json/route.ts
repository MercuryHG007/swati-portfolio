import { OPENAPI_MEDIA_TYPE, openApiDocument } from "@/lib/api-catalog";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(JSON.stringify(openApiDocument()), {
    headers: { "Content-Type": OPENAPI_MEDIA_TYPE },
  });
}
