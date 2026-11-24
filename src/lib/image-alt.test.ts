import { describe, expect, it } from "vitest";
import { withAltFallback, withSuggestedAlt } from "./image-alt";

describe("withSuggestedAlt", () => {
  it("fills the first image when it has no alt text", () => {
    const images = [{ publicId: "one" }, { publicId: "two", alt: "Existing" }];
    expect(withSuggestedAlt(images, "A red bird")).toEqual([
      { publicId: "one", alt: "A red bird" },
      { publicId: "two", alt: "Existing" },
    ]);
  });

  it("never replaces an alt text that is already written", () => {
    const images = [{ publicId: "one", alt: "Hand written" }];
    expect(withSuggestedAlt(images, "A red bird")).toBe(images);
  });

  it("leaves the list alone when there is no suggestion or no image", () => {
    const images = [{ publicId: "one" }];
    expect(withSuggestedAlt(images, "")).toBe(images);
    expect(withSuggestedAlt([], "A red bird")).toEqual([]);
  });
});

describe("withAltFallback", () => {
  it("uses the title for images without alt text, and keeps existing alt text", () => {
    const images = [{ publicId: "one", alt: "" }, { publicId: "two", alt: "Custom" }, { publicId: "three" }];
    expect(withAltFallback(images, "Sunrise").map((image) => image.alt)).toEqual(["Sunrise", "Custom", "Sunrise"]);
  });

  it("does not mutate the input images", () => {
    const images = [{ publicId: "one" }];
    withAltFallback(images, "Sunrise");
    expect(images[0]).not.toHaveProperty("alt");
  });

  it("leaves the list alone when the title is empty", () => {
    const images = [{ publicId: "one" }];
    expect(withAltFallback(images, "")).toBe(images);
  });
});
