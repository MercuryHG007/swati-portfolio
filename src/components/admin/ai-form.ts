// Helpers shared by the admin AI buttons. They read hidden image fields and fill only empty inputs,
// so anything the admin has already written is kept.

// Image fields hold a JSON list (artworks) or a single object or null (series cover).
export function readPublicId(form: HTMLFormElement, fieldName: string): string | null {
  const field = form.elements.namedItem(fieldName) as HTMLInputElement | null;
  try {
    const value: unknown = JSON.parse(field?.value || "null");
    const image = Array.isArray(value) ? value[0] : value;
    const publicId = image && typeof image === "object" ? (image as { publicId?: unknown }).publicId : null;
    return typeof publicId === "string" ? publicId : null;
  } catch {
    return null;
  }
}

export function setTextIfEmpty(form: HTMLFormElement, name: string, value: string): boolean {
  const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!field || field.value.trim() || !value) return false;
  field.value = value;
  return true;
}
