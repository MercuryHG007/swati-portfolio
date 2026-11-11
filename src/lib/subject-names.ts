import { slugify } from "./slugify";

export const MAX_SUBJECT_NAME_LENGTH = 60;

export function normalizeSubjectName(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_SUBJECT_NAME_LENGTH).trim();
}

// Compares by slug, the same key the Subject collection enforces as unique, so "Florals" and "florals" match.
export function newSubjectNames(names: string[], existingNames: string[]): string[] {
  const taken = new Set(existingNames.map((name) => slugify(name)));
  const result: string[] = [];
  for (const raw of names) {
    const name = normalizeSubjectName(raw);
    const key = slugify(name);
    if (!name || !key || taken.has(key)) continue;
    taken.add(key);
    result.push(name);
  }
  return result;
}
