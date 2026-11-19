import { slugify } from "@/lib/slugify";

// The slice of a Mongoose model these helpers use. Typed structurally so tests can pass a fake.
export type SlugModel = {
  exists(filter: Record<string, unknown>): PromiseLike<unknown>;
  updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): PromiseLike<unknown>;
};

// Slugs are always derived from the title, so a corrected title also corrects the URL on the next save.
export function slugForTitle(title: string): string {
  return slugify(title);
}

export async function isSlugTaken(model: SlugModel, slug: string, exceptId?: string): Promise<boolean> {
  return Boolean(await model.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }));
}

// Returns the fields to merge into an update so the previous slug keeps redirecting. Also takes the new
// slug out of every history: it is now a live slug, and a stale redirect must never point at another item.
export async function prepareSlugChange(
  model: SlugModel,
  previousSlug: string | undefined,
  nextSlug: string,
): Promise<Record<string, unknown>> {
  if (!previousSlug || previousSlug === nextSlug) return {};
  await model.updateMany({ slugHistory: nextSlug }, { $pull: { slugHistory: nextSlug } });
  return { $addToSet: { slugHistory: previousSlug } };
}
