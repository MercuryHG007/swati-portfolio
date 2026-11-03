// Helpers for reading the hidden JSON fields the admin forms submit (images and CV rows).
//
// A field that is missing from the submission, or that can't be parsed, returns `undefined`, which
// callers treat as "leave the stored value alone". Only an explicit empty value ("[]" or "null")
// clears it. Otherwise a form that didn't send a field, such as a page left open from before the
// field existed, would wipe the stored data and delete its Cloudinary assets.

export type ImageValue = { publicId: string; width: number; height: number; alt?: string };

function readJsonField(formData: FormData, name: string): unknown {
  if (!formData.has(name)) return undefined;
  const raw = formData.get(name);
  if (typeof raw !== "string") return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function readImageList(formData: FormData, name: string): ImageValue[] | undefined {
  const value = readJsonField(formData, name);
  return Array.isArray(value) ? (value as ImageValue[]) : undefined;
}

// `null` means the image was removed; `undefined` means the field wasn't submitted.
export function readSingleImage(formData: FormData, name: string): ImageValue | null | undefined {
  const value = readJsonField(formData, name);
  if (value === null) return null;
  return typeof value === "object" && !Array.isArray(value) ? (value as ImageValue) : undefined;
}

export type CvRowValue = { title: string; detail: string; date: string };

// Blank rows are dropped and fields trimmed.
export function readCvRows(formData: FormData, name: string): CvRowValue[] | undefined {
  const value = readJsonField(formData, name);
  if (!Array.isArray(value)) return undefined;
  return value
    .map((row) => {
      const entry = (row ?? {}) as Record<string, unknown>;
      return {
        title: String(entry.title ?? "").trim().slice(0, 300),
        detail: String(entry.detail ?? "").trim().slice(0, 300),
        date: String(entry.date ?? "").trim().slice(0, 100),
      };
    })
    .filter((row) => row.title);
}
