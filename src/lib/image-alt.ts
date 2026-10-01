type ImageLike = { alt?: string; [key: string]: unknown };

// Numbered ("Title 1", "Title 2", ...) when there's more than one image, otherwise just the title.
export function withAltFallback<T extends ImageLike>(images: T[], title: string): T[] {
  if (!title) return images;
  return images.map((image, index) => ({
    ...image,
    alt: image.alt || (images.length > 1 ? `${title} ${index + 1}` : title),
  }));
}
