import { describe, expect, it } from "vitest";
import {
  aboutDescription,
  contactDescription,
  exhibitionsDescription,
  faqDescription,
  joinNames,
  portfolioDescription,
  seriesDescription,
  siteDescription,
} from "./descriptions";

describe("joinNames", () => {
  it("joins names as an English list", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["Oil"])).toBe("Oil");
    expect(joinNames(["Oil", "Pencil"])).toBe("Oil and Pencil");
    expect(joinNames(["Oil", "Pencil", "Acrylic"])).toBe("Oil, Pencil and Acrylic");
  });
});

describe("siteDescription", () => {
  it("builds the description from tagline, mediums and location", () => {
    expect(
      siteDescription({
        tagline: "Watercolor & mixed media artist",
        location: "Ghaziabad, India",
        mediums: ["Watercolor", "Acrylic", "Oil"],
      })
    ).toBe(
      "Swati Garg, Watercolor & mixed media artist. Works in Watercolor, Acrylic and Oil. Based in Ghaziabad, India."
    );
  });

  it("leaves out the parts that have no data", () => {
    expect(siteDescription({ mediums: [] })).toBe("Swati Garg.");
    expect(siteDescription({ tagline: "Painter", mediums: ["Pencil"] })).toBe("Swati Garg, Painter. Works in Pencil.");
  });
});

describe("aboutDescription", () => {
  it("uses the exhibition count, with correct singular and plural", () => {
    const base = { tagline: "Watercolor artist", location: "Ghaziabad, India" };
    expect(aboutDescription({ ...base, exhibitionCount: 1 })).toBe(
      "About Swati Garg, Watercolor artist. Based in Ghaziabad, India. Education, awards and 1 exhibition."
    );
    expect(aboutDescription({ ...base, exhibitionCount: 12 })).toContain("Education, awards and 12 exhibitions.");
  });

  it("falls back to a generic line when there are no exhibitions", () => {
    expect(aboutDescription({ tagline: "Painter", exhibitionCount: 0 })).toBe(
      "About Swati Garg, Painter. Education and awards."
    );
  });
});

describe("contactDescription", () => {
  it("names the artist, tagline and location", () => {
    expect(contactDescription({ tagline: "Painter", location: "Ghaziabad, India" })).toBe(
      "Contact Swati Garg, Painter. Based in Ghaziabad, India. Enquire about commissions and works."
    );
  });
});

describe("faqDescription", () => {
  it("includes the first two questions", () => {
    const text = faqDescription({ questions: ["Do you take commissions?", "How do I buy a work?", "Third question?"] });
    expect(text).toContain("Do you take commissions? How do I buy a work?");
    expect(text).not.toContain("Third question?");
  });

  it("works without questions", () => {
    expect(faqDescription({ questions: [] })).toBe("Common questions about Swati Garg and her paintings.");
  });
});

describe("portfolioDescription", () => {
  it("lists the mediums and subjects that have published work", () => {
    expect(
      portfolioDescription({
        mediums: ["Acrylic", "Pencil", "Watercolor"],
        subjects: ["Cranes", "Lotus", "Cottages", "Mountains", "Boats"],
      })
    ).toBe(
      "Browse paintings by Swati Garg in Acrylic, Pencil and Watercolor. Subjects include Cranes, Lotus, Cottages and Mountains. Filter by medium and subject."
    );
  });

  it("drops the sentences that have no data", () => {
    expect(portfolioDescription({ mediums: [], subjects: [] })).toBe(
      "Browse paintings by Swati Garg. Filter by medium and subject."
    );
  });
});

describe("seriesDescription", () => {
  it("counts the series and names the first three", () => {
    expect(seriesDescription({ titles: ["Winter", "Lotus", "Crane", "Ochre"] })).toBe(
      "4 painting series by Swati Garg, including Winter, Lotus and Crane."
    );
    expect(seriesDescription({ titles: ["Winter"] })).toBe("1 painting series by Swati Garg, including Winter.");
  });

  it("has a generic line when there are no series", () => {
    expect(seriesDescription({ titles: [] })).toBe("Painting series by Swati Garg.");
  });
});

describe("exhibitionsDescription", () => {
  it("counts the exhibitions and names the latest one with its venue", () => {
    expect(exhibitionsDescription({ count: 3, latest: { title: "Winter Muse", venue: "Utsav Arts" } })).toBe(
      "3 solo and group exhibitions by Swati Garg, including Winter Muse at Utsav Arts."
    );
  });

  it("uses the singular form for one exhibition and skips the venue when unknown", () => {
    expect(exhibitionsDescription({ count: 1, latest: { title: "Sadwi" } })).toBe(
      "1 solo and group exhibition by Swati Garg, including Sadwi."
    );
  });

  it("has a generic line when there are no exhibitions", () => {
    expect(exhibitionsDescription({ count: 0 })).toBe("Solo and group exhibitions by Swati Garg.");
  });
});

describe("description length", () => {
  it("keeps every builder within a search snippet", () => {
    const many = Array.from({ length: 12 }, (_, index) => `Name number ${index + 1}`);
    const texts = [
      siteDescription({ tagline: "Watercolor & mixed media artist", location: "Ghaziabad, India", mediums: many }),
      aboutDescription({ tagline: "Watercolor & mixed media artist", location: "Ghaziabad, India", exhibitionCount: 40 }),
      contactDescription({ tagline: "Watercolor & mixed media artist", location: "Ghaziabad, India" }),
      faqDescription({ questions: [`${"A very long question ".repeat(8)}?`, `${"Another long question ".repeat(8)}?`] }),
      portfolioDescription({ mediums: many, subjects: many }),
      seriesDescription({ titles: many }),
      exhibitionsDescription({ count: 40, latest: { title: many[0], venue: many[1] } }),
    ];
    for (const text of texts) {
      expect(text.length).toBeLessThanOrEqual(155);
    }
  });
});
