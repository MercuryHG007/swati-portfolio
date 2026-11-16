type CvEntry = { title: string; date?: string };

// Starter answers built from saved About data and the site's enquiry flow. Questions without data are left out.
export function buildStarterFaqs({
  location,
  mediumNames,
  education,
  contactEmail,
}: {
  location?: string;
  mediumNames: string[];
  education: CvEntry[];
  contactEmail?: string;
}): { question: string; answer: string }[] {
  const questions: { question: string; answer: string }[] = [];
  if (location) {
    questions.push({ question: "Where is Swati Garg based?", answer: `Swati Garg lives and works in ${location}.` });
  }
  if (mediumNames.length > 0) {
    const mediums = joinList(mediumNames.map((name) => name.toLowerCase()));
    questions.push({ question: "What mediums does Swati Garg work in?", answer: `Swati Garg works in ${mediums}.` });
  }
  if (education.length > 0) {
    const entries = education.map((entry) => (entry.date ? `${entry.title} (${entry.date})` : entry.title));
    questions.push({ question: "What is Swati Garg's education?", answer: `${joinList(entries)}.` });
  }
  questions.push({
    question: "Can I buy a work?",
    answer:
      "Works marked Available can be enquired about through the contact page. Works marked Sold stay listed for reference.",
  });
  questions.push({
    question: "How do I contact Swati Garg?",
    answer: `Send a message through the contact page${contactEmail ? ` or by email at ${contactEmail}` : ""}.`,
  });
  return questions;
}

function joinList(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
