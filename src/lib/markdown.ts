import { CONTENT_SIGNAL } from "@/lib/seo";

export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

// Agents ask for markdown with `Accept: text/markdown`. Browsers send text/html, so they keep getting HTML.
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  return accept.split(",").some((part) => {
    const [type, ...params] = part.split(";").map((value) => value.trim().toLowerCase());
    if (type !== "text/markdown") return false;
    const quality = params.find((param) => param.startsWith("q="));
    return !quality || Number(quality.slice(2)) > 0;
  });
}

export function markdownResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": MARKDOWN_CONTENT_TYPE,
      "Content-Signal": CONTENT_SIGNAL,
      // An estimate of about four characters per token, not a count from a model tokenizer.
      "x-markdown-tokens": String(Math.ceil(body.length / 4)),
      Vary: "Accept",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

// Values are JSON-quoted, which is also valid YAML, so titles with colons or quotes stay intact.
export function frontMatter(fields: Record<string, string | undefined>): string {
  const lines = Object.entries(fields).flatMap(([key, value]) => (value ? [`${key}: ${JSON.stringify(value)}`] : []));
  return lines.length > 0 ? `---\n${lines.join("\n")}\n---\n\n` : "";
}

export function escapeLinkText(text: string): string {
  return text.replace(/[[\]]/g, "\\$&");
}
