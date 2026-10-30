import { cloudinary } from "./cloudinary";

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
