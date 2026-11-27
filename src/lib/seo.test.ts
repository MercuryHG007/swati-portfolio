import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteUrl, artistJsonLd, collectionJsonLd, getSiteUrl } from "./seo";

describe("getSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses NEXT_PUBLIC_SITE_URL over the Vercel domains when it is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.example.com/");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "example.vercel.app");
    expect(getSiteUrl().origin).toBe("https://www.example.com");
    expect(absoluteUrl("/artwork/a")).toBe("https://www.example.com/artwork/a");
  });

  it("falls back to the Vercel production domain when no site URL is pinned", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "www.example.com");
    expect(getSiteUrl().origin).toBe("https://www.example.com");
  });
});

describe("artistJsonLd", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("omits optional fields when the profile is empty", () => {
    const json = artistJsonLd();
    expect(json).not.toHaveProperty("sameAs");
    expect(json).not.toHaveProperty("image");
    expect(json).not.toHaveProperty("description");
    expect(json).not.toHaveProperty("homeLocation");
    expect(json).toMatchObject({ "@type": "Person", name: "Swati Garg", jobTitle: "Artist" });
  });

  it("lists every social profile in sameAs, skipping blank ones", () => {
    const json = artistJsonLd({
      socials: {
        instagram: "https://www.instagram.com/swati_22022",
        facebook: "",
        linkedin: "https://www.linkedin.com/in/swati",
        youtube: undefined,
      },
    });
    expect(json.sameAs).toEqual([
      "https://www.instagram.com/swati_22022",
      "https://www.linkedin.com/in/swati",
    ]);
  });

  it("uses the bio as the description, trimmed to a search-friendly length", () => {
    const json = artistJsonLd({ bio: "  A watercolor painter.\n\nBased in India.  " });
    expect(json.description).toBe("A watercolor painter. Based in India.");
  });

  it("adds the photo from the media domain and the home location", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://media.example.com");
    const json = artistJsonLd({ photoPublicId: "swati-portfolio/about/photo", location: "Ghaziabad, India" });
    expect(String(json.image)).toMatch(/^https:\/\/media\.example\.com\//);
    expect(json.homeLocation).toEqual({ "@type": "Place", name: "Ghaziabad, India" });
  });
});

describe("collectionJsonLd", () => {
  it("describes a listing page and links it to the website", () => {
    const json = collectionJsonLd({ name: "Series", description: "Painting series.", path: "/series" });
    expect(json).toMatchObject({ "@type": "CollectionPage", name: "Series", description: "Painting series." });
    expect(String(json.url)).toMatch(/\/series$/);
    expect(json.isPartOf).toEqual({ "@id": expect.stringMatching(/\/#website$/) });
  });
});
