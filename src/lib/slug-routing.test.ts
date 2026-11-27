import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const model = () => ({ exists: vi.fn(), findOne: vi.fn() });
  return {
    Artwork: model(),
    Series: model(),
    Exhibition: model(),
    Medium: model(),
    Subject: model(),
    breakerOpen: vi.fn(() => false),
    noPublishedArtworks: vi.fn(async () => false),
  };
});

vi.mock("@/models", () => ({
  Artwork: mocks.Artwork,
  Series: mocks.Series,
  Exhibition: mocks.Exhibition,
  Medium: mocks.Medium,
  Subject: mocks.Subject,
}));

vi.mock("@/lib/resilient-read", () => ({
  databaseBreakerOpen: mocks.breakerOpen,
  databaseHasNoPublishedArtworks: mocks.noPublishedArtworks,
}));

import { matchSlugRoute, resolveSlugRoute } from "./slug-routing";

// findOne(...).select(...).lean() resolves to the historical record, or null.
function historyLookup(value: { slug: string } | null) {
  return { select: () => ({ lean: async () => value }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.breakerOpen.mockReturnValue(false);
  mocks.noPublishedArtworks.mockResolvedValue(false);
  for (const name of ["Artwork", "Series", "Exhibition", "Medium", "Subject"] as const) {
    mocks[name].exists.mockResolvedValue(null);
    mocks[name].findOne.mockReturnValue(historyLookup(null));
  }
});

describe("matchSlugRoute", () => {
  it("matches each detail route and captures its slug", () => {
    expect(matchSlugRoute("/artwork/lotus-3")?.slug).toBe("lotus-3");
    expect(matchSlugRoute("/artwork/lotus-3/")?.slug).toBe("lotus-3");
    expect(matchSlugRoute("/portfolio/series/crane")?.slug).toBe("crane");
    expect(matchSlugRoute("/exhibitions/sadwi")?.slug).toBe("sadwi");
    expect(matchSlugRoute("/portfolio/medium/watercolor")?.slug).toBe("watercolor");
    expect(matchSlugRoute("/portfolio/subject/birds")?.slug).toBe("birds");
  });

  it("ignores paths that are not a single detail slug", () => {
    expect(matchSlugRoute("/")).toBeNull();
    expect(matchSlugRoute("/portfolio")).toBeNull();
    expect(matchSlugRoute("/artwork")).toBeNull();
    expect(matchSlugRoute("/artwork/lotus-3/extra")).toBeNull();
    expect(matchSlugRoute("/portfolio/series")).toBeNull();
  });
});

describe("resolveSlugRoute", () => {
  it("serves a published artwork as usual", async () => {
    mocks.Artwork.exists.mockResolvedValue({ _id: "1" });
    expect(await resolveSlugRoute("/artwork/lotus-3")).toBeNull();
  });

  it("permanently redirects an old artwork slug to its current slug", async () => {
    mocks.Artwork.findOne.mockReturnValue(historyLookup({ slug: "untold-stories" }));
    expect(await resolveSlugRoute("/artwork/told-stories")).toEqual({
      kind: "moved",
      location: "/artwork/untold-stories",
      status: 308,
    });
  });

  it("reports an unknown artwork slug as gone", async () => {
    expect(await resolveSlugRoute("/artwork/does-not-exist")).toEqual({ kind: "gone" });
  });

  it("reports an unknown series and exhibition slug as gone", async () => {
    expect(await resolveSlugRoute("/portfolio/series/nope")).toEqual({ kind: "gone" });
    expect(await resolveSlugRoute("/exhibitions/nope")).toEqual({ kind: "gone" });
  });

  it("redirects a legacy medium or subject URL to the portfolio filter", async () => {
    mocks.Medium.exists.mockResolvedValue({ _id: "m" });
    mocks.Subject.exists.mockResolvedValue({ _id: "s" });
    expect(await resolveSlugRoute("/portfolio/medium/watercolor")).toEqual({
      kind: "moved",
      location: "/portfolio?medium=watercolor#portfolio",
      status: 308,
    });
    expect(await resolveSlugRoute("/portfolio/subject/birds")).toEqual({
      kind: "moved",
      location: "/portfolio?subject=birds#portfolio",
      status: 308,
    });
  });

  it("serves the page when the database has no published artworks at all (treated as wiped)", async () => {
    mocks.noPublishedArtworks.mockResolvedValue(true);
    expect(await resolveSlugRoute("/artwork/does-not-exist")).toBeNull();
  });

  it("fails open when the lookup throws, so the snapshot fallback can answer", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.Artwork.exists.mockRejectedValue(new Error("buffering timed out"));
    expect(await resolveSlugRoute("/artwork/lotus-3")).toBeNull();
    consoleError.mockRestore();
  });

  it("skips the database entirely while the breaker is open", async () => {
    mocks.breakerOpen.mockReturnValue(true);
    expect(await resolveSlugRoute("/artwork/does-not-exist")).toBeNull();
    expect(mocks.Artwork.exists).not.toHaveBeenCalled();
  });

  it("ignores paths without a detail slug", async () => {
    expect(await resolveSlugRoute("/about")).toBeNull();
    expect(mocks.Artwork.exists).not.toHaveBeenCalled();
  });
});
