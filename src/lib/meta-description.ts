const DEFAULT_MAX_LENGTH = 155;

// Search snippets cut off around 155-160 characters. Prefer ending on a sentence, then on a word.
export function toMetaDescription(text: string | undefined, maxLength = DEFAULT_MAX_LENGTH): string | undefined {
  const clean = text?.replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  if (clean.length <= maxLength) return clean;

  const head = clean.slice(0, maxLength);
  const sentenceEnd = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  if (sentenceEnd > maxLength / 2) return head.slice(0, sentenceEnd + 1);

  const wordEnd = head.lastIndexOf(" ");
  return `${head.slice(0, wordEnd > 0 ? wordEnd : maxLength).trimEnd()}…`;
}
