type ImageLike = { alt?: string; [key: string]: unknown };

// Used only when the first image has no alt text yet, so an existing hand-written alt is never replaced.
export function withSuggestedAlt<T extends ImageLike>(images: T[], suggestedAlt: string): T[] {
  if (!suggestedAlt || !images[0] || images[0].alt) return images;
  return [{ ...images[0], alt: suggestedAlt }, ...images.slice(1)];
}

// Numbered ("Title 1", "Title 2", ...) when there's more than one image, otherwise just the title.
export function withAltFallback<T extends ImageLike>(images: T[], title: string): T[] {
  if (!title) return images;
  return images.map((image, index) => ({
    ...image,
    alt: image.alt || (images.length > 1 ? `${title} ${index + 1}` : title),
  }));
}
