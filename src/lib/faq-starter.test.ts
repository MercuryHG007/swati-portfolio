import { describe, expect, it } from "vitest";
import { buildStarterFaqs } from "./faq-starter";

const questionsOf = (faqs: { question: string }[]) => faqs.map((faq) => faq.question);

describe("buildStarterFaqs", () => {
  it("always includes the buying and contact questions", () => {
    const faqs = buildStarterFaqs({ mediumNames: [], education: [] });
    expect(questionsOf(faqs)).toEqual(["Can I buy a work?", "How do I contact Swati Garg?"]);
    expect(faqs[1].answer).toBe("Send a message through the contact page.");
  });

  it("adds the email to the contact answer when one is set", () => {
    const faqs = buildStarterFaqs({ mediumNames: [], education: [], contactEmail: "a@b.com" });
    expect(faqs[1].answer).toBe("Send a message through the contact page or by email at a@b.com.");
  });

  it("builds answers from location, mediums and education, in that order", () => {
    const faqs = buildStarterFaqs({
      location: "Delhi, India",
      mediumNames: ["Oil", "Watercolour", "Ink"],
      education: [{ title: "BFA, Painting", date: "2015" }, { title: "MFA" }],
    });
    expect(questionsOf(faqs)).toEqual([
      "Where is Swati Garg based?",
      "What mediums does Swati Garg work in?",
      "What is Swati Garg's education?",
      "Can I buy a work?",
      "How do I contact Swati Garg?",
    ]);
    expect(faqs[0].answer).toBe("Swati Garg lives and works in Delhi, India.");
    expect(faqs[1].answer).toBe("Swati Garg works in oil, watercolour and ink.");
    expect(faqs[2].answer).toBe("BFA, Painting (2015) and MFA.");
  });

  it("joins a single item without a conjunction", () => {
    const faqs = buildStarterFaqs({ mediumNames: ["Oil"], education: [] });
    expect(faqs[0].answer).toBe("Swati Garg works in oil.");
  });

  it("uses commas for three or more education entries", () => {
    const faqs = buildStarterFaqs({
      mediumNames: [],
      education: [{ title: "A" }, { title: "B" }, { title: "C" }],
    });
    expect(faqs[0].answer).toBe("A, B and C.");
  });
});
