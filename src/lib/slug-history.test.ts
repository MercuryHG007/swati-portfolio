import { describe, expect, it, vi } from "vitest";
import { isSlugTaken, prepareSlugChange, slugForTitle, type SlugModel } from "./slug-history";

function fakeModel(existsResult: unknown = null): SlugModel & {
  exists: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
} {
  return {
    exists: vi.fn(async () => existsResult),
    updateMany: vi.fn(async () => ({})),
  };
}

describe("slugForTitle", () => {
  it("derives the slug from the corrected title", () => {
    expect(slugForTitle("The Valley of Quiet Snow")).toBe("the-valley-of-quiet-snow");
  });
});

describe("isSlugTaken", () => {
  it("checks every item when no id is given", async () => {
    const model = fakeModel({ _id: "a" });
    expect(await isSlugTaken(model, "x")).toBe(true);
    expect(model.exists).toHaveBeenCalledWith({ slug: "x" });
  });

  it("excludes the item being edited", async () => {
    const model = fakeModel(null);
    expect(await isSlugTaken(model, "x", "123")).toBe(false);
    expect(model.exists).toHaveBeenCalledWith({ slug: "x", _id: { $ne: "123" } });
  });
});

describe("prepareSlugChange", () => {
  it("does nothing when the slug is unchanged", async () => {
    const model = fakeModel();
    expect(await prepareSlugChange(model, "same", "same")).toEqual({});
    expect(model.updateMany).not.toHaveBeenCalled();
  });

  it("does nothing for a new item with no previous slug", async () => {
    const model = fakeModel();
    expect(await prepareSlugChange(model, undefined, "new")).toEqual({});
    expect(model.updateMany).not.toHaveBeenCalled();
  });

  it("keeps the previous slug and frees the new one from every history", async () => {
    const model = fakeModel();
    const update = await prepareSlugChange(model, "the-valley-of-quite-snow", "the-valley-of-quiet-snow");
    expect(model.updateMany).toHaveBeenCalledWith(
      { slugHistory: "the-valley-of-quiet-snow" },
      { $pull: { slugHistory: "the-valley-of-quiet-snow" } },
    );
    expect(update).toEqual({ $addToSet: { slugHistory: "the-valley-of-quite-snow" } });
  });
});
