import { describe, expect, it } from "vitest";
import { CONTENT_SIGNAL } from "./seo";
import { MARKDOWN_CONTENT_TYPE, escapeLinkText, frontMatter, markdownResponse, prefersMarkdown } from "./markdown";

describe("prefersMarkdown", () => {
  it("is false when there is no Accept header", () => {
    expect(prefersMarkdown(null)).toBe(false);
    expect(prefersMarkdown("")).toBe(false);
  });

  it("is false for browsers, which send HTML", () => {
    expect(prefersMarkdown("text/html,application/xhtml+xml,*/*;q=0.8")).toBe(false);
  });

  it("is true when markdown is requested, in any position and case", () => {
    expect(prefersMarkdown("text/markdown")).toBe(true);
    expect(prefersMarkdown("text/html, text/markdown;q=0.9")).toBe(true);
    expect(prefersMarkdown("TEXT/MARKDOWN")).toBe(true);
    expect(prefersMarkdown("text/markdown; q=0.5")).toBe(true);
  });

  it("is false when markdown is refused with q=0", () => {
    expect(prefersMarkdown("text/markdown;q=0")).toBe(false);
    expect(prefersMarkdown("text/markdown;q=0.0")).toBe(false);
  });

  it("does not match similar media types", () => {
    expect(prefersMarkdown("text/markdownx")).toBe(false);
  });
});

describe("markdownResponse", () => {
  it("sets the markdown headers and returns the body", async () => {
    const response = markdownResponse("# Hi");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(MARKDOWN_CONTENT_TYPE);
    expect(response.headers.get("Content-Signal")).toBe(CONTENT_SIGNAL);
    expect(response.headers.get("Vary")).toBe("Accept");
    expect(await response.text()).toBe("# Hi");
  });

  it("estimates tokens at about four characters each, rounding up", () => {
    expect(markdownResponse("# Hi").headers.get("x-markdown-tokens")).toBe("1");
    expect(markdownResponse("hello").headers.get("x-markdown-tokens")).toBe("2");
  });
});

describe("frontMatter", () => {
  it("writes JSON-quoted values between YAML fences", () => {
    expect(frontMatter({ title: 'A: "B"', date: undefined, empty: "" })).toBe(
      `---\ntitle: ${JSON.stringify('A: "B"')}\n---\n\n`,
    );
  });

  it("returns an empty string when no field has a value", () => {
    expect(frontMatter({})).toBe("");
    expect(frontMatter({ title: undefined })).toBe("");
  });
});

describe("escapeLinkText", () => {
  it("escapes square brackets so link text stays intact", () => {
    expect(escapeLinkText("[a] and ]b[")).toBe("\\[a\\] and \\]b\\[");
  });

  it("leaves other text unchanged", () => {
    expect(escapeLinkText("Sunrise: study")).toBe("Sunrise: study");
  });
});
