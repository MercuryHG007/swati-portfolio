import { cloudinary } from "./cloudinary";
import { connectToDatabase } from "./mongodb";
import { About, Artwork, Exhibition, Series } from "@/models";

type ImageRef = { publicId: string } | null | undefined;

// Deleting a record, or replacing one of its images on edit, previously left the old
// Cloudinary asset orphaned forever — call this wherever an image reference is dropped.
export async function destroyCloudinaryAssets(publicIds: string[]) {
  const unique = [...new Set(publicIds.filter(Boolean))];
  await Promise.all(
    unique.map((publicId) =>
      cloudinary.uploader.destroy(publicId).catch((err) => {
        console.error(`Failed to delete Cloudinary asset ${publicId}:`, err);
      })
    )
  );
}

// Public ids present in `oldImages` but no longer referenced in `newImages`.
export function removedPublicIds(oldImages: ImageRef[], newImages: ImageRef[]): string[] {
  const keep = new Set(newImages.filter(Boolean).map((img) => img!.publicId));
  return oldImages
    .filter(Boolean)
    .map((img) => img!.publicId)
    .filter((publicId) => !keep.has(publicId));
}

// Destroys uploads that no saved record points to, e.g. images added in a form that was then
// cancelled. Ids still referenced anywhere are skipped, so a save that already happened is never undone.
export async function destroyUnreferencedUploads(publicIds: string[]) {
  const candidates = [...new Set(publicIds.filter(Boolean))];
  if (candidates.length === 0) return;

  await connectToDatabase();
  const filter = { $in: candidates };
  const referenced = await Promise.all([
    Artwork.distinct("images.publicId", { "images.publicId": filter }),
    Exhibition.distinct("images.publicId", { "images.publicId": filter }),
    Series.distinct("coverImage.publicId", { "coverImage.publicId": filter }),
    About.distinct("photo.publicId", { "photo.publicId": filter }),
    About.distinct("footerLogo.publicId", { "footerLogo.publicId": filter }),
  ]);
  const stored = new Set(referenced.flat().map(String));
  await destroyCloudinaryAssets(candidates.filter((publicId) => !stored.has(publicId)));
}
