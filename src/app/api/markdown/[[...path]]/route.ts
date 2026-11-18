import { markdownResponse } from "@/lib/markdown";
import { renderMarkdownPage } from "@/lib/markdown-pages";

// The proxy rewrites requests with `Accept: text/markdown` here, with the page path as the route segments.
// `/api/` is disallowed in robots.txt, so this copy isn't crawled.
export async function GET(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const body = await renderMarkdownPage(path.length > 0 ? `/${path.join("/")}` : "/");
  if (!body) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return markdownResponse(body);
}
