import { describe, expect, it } from "vitest";
import { describeLeadSource, parseArtworkSlug, parseAttribution } from "./lead-source";

describe("parseArtworkSlug", () => {
  it("accepts and lowercases a slug", () => {
    expect(parseArtworkSlug("  Sunrise-Study  ")).toBe("sunrise-study");
  });

  it("rejects malformed slugs and non-strings", () => {
    expect(parseArtworkSlug("bad slug!")).toBe("");
    expect(parseArtworkSlug("a--b")).toBe("");
    expect(parseArtworkSlug("-a")).toBe("");
    expect(parseArtworkSlug(5)).toBe("");
  });

  it("rejects slugs longer than 200 characters", () => {
    expect(parseArtworkSlug("a".repeat(200))).toHaveLength(200);
    expect(parseArtworkSlug("a".repeat(201))).toBe("");
  });
});

describe("parseAttribution", () => {
  it("returns undefined for missing, invalid or non-object input", () => {
    expect(parseAttribution(undefined)).toBeUndefined();
    expect(parseAttribution("")).toBeUndefined();
    expect(parseAttribution("not json")).toBeUndefined();
    expect(parseAttribution("[1,2]")).toBeUndefined();
    expect(parseAttribution("null")).toBeUndefined();
    expect(parseAttribution('"text"')).toBeUndefined();
  });

  it("keeps only known fields, trimmed and without blanks", () => {
    const raw = JSON.stringify({ utmSource: " instagram ", utmMedium: "", other: "x" });
    expect(parseAttribution(raw)).toEqual({ utmSource: "instagram" });
  });

  it("returns undefined when no known field has a value", () => {
    expect(parseAttribution('{"utmSource":5}')).toBeUndefined();
  });

  it("caps each value at 300 characters", () => {
    const raw = JSON.stringify({ referrer: "x".repeat(400) });
    expect(parseAttribution(raw)?.referrer).toHaveLength(300);
  });
});

describe("describeLeadSource", () => {
  it("joins the artwork, campaign and referrer with dots", () => {
    expect(
      describeLeadSource({
        artworkSlug: "sunrise-study",
        utmSource: "instagram",
        utmMedium: "story",
        utmCampaign: "spring",
        referrer: "https://example.com",
      }),
    ).toBe("Artwork: sunrise-study · Campaign: instagram / story / spring · Referrer: https://example.com");
  });

  it("omits missing parts", () => {
    expect(describeLeadSource({ utmSource: "newsletter" })).toBe("Campaign: newsletter");
    expect(describeLeadSource({})).toBe("");
  });
});
