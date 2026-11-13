type ImageLike = { alt?: string; [key: string]: unknown };

// Used only when the first image has no alt text yet, so an existing hand-written alt is never replaced.
export function withSuggestedAlt<T extends ImageLike>(images: T[], suggestedAlt: string): T[] {
  if (!suggestedAlt || !images[0] || images[0].alt) return images;
  return [{ ...images[0], alt: suggestedAlt }, ...images.slice(1)];
}

// Uses the bare title. Index suffixes ("Title 1") read as noise to screen readers.
export function withAltFallback<T extends ImageLike>(images: T[], title: string): T[] {
  if (!title) return images;
  return images.map((image) => ({ ...image, alt: image.alt || title }));
}
