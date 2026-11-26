import { describe, expect, it } from "vitest";
import { missingAboutFields } from "./about-completeness";

const complete = {
  photo: { publicId: "p" },
  bio: "Bio",
  statement: "Statement",
  location: "Pune",
  footerLogo: { publicId: "l" },
  resumeUrl: "https://example.com/cv.pdf",
  contactEmail: "hello@example.com",
  socials: { instagram: "https://instagram.com/x" },
};

describe("missingAboutFields", () => {
  it("returns nothing when every field is filled", () => {
    expect(missingAboutFields(complete)).toEqual([]);
  });

  it("lists every field when there is no About document", () => {
    expect(missingAboutFields(null)).toEqual([
      "Photo",
      "Bio",
      "Artist statement",
      "Location",
      "Footer logo",
      "CV download URL",
      "Contact email",
      "Instagram",
    ]);
  });

  it("treats whitespace-only text as missing", () => {
    expect(missingAboutFields({ ...complete, bio: "   ", contactEmail: "" })).toEqual(["Bio", "Contact email"]);
  });

  it("reports a missing photo or footer logo when the image has no publicId", () => {
    expect(missingAboutFields({ ...complete, photo: null, footerLogo: {} })).toEqual(["Photo", "Footer logo"]);
  });

  it("reports a missing Instagram link when socials are absent", () => {
    expect(missingAboutFields({ ...complete, socials: undefined })).toEqual(["Instagram"]);
  });
});
