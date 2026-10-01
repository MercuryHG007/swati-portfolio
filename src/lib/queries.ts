import { connectToDatabase } from "@/lib/mongodb";
import { Series, Medium, Subject, Artwork, Exhibition, About } from "@/models";

export async function getPublishedSeries() {
  await connectToDatabase();
  return Series.find({ status: "published" }).sort({ order: 1, title: 1 }).lean();
}

export async function getSeriesBySlug(slug: string) {
  await connectToDatabase();
  return Series.findOne({ slug, status: "published" }).lean();
}

export async function getMediums() {
  await connectToDatabase();
  return Medium.find().sort({ name: 1 }).lean();
}

export async function getMediumBySlug(slug: string) {
  await connectToDatabase();
  return Medium.findOne({ slug }).lean();
}

export async function getSubjects() {
  await connectToDatabase();
  return Subject.find().sort({ name: 1 }).lean();
}

export async function getSubjectBySlug(slug: string) {
  await connectToDatabase();
  return Subject.findOne({ slug }).lean();
}

export async function getFeaturedArtworks(limit = 4) {
  await connectToDatabase();
  const featured = await Artwork.find({ status: "published", featured: true })
    .sort({ order: 1, createdAt: -1 })
    .limit(limit)
    .lean();
  if (featured.length > 0) return featured;

  // Nothing explicitly featured yet — fall back to the work made most recently
  // (by `year`, not upload date — an artist may upload an older piece later).
  return Artwork.find({ status: "published" }).sort({ year: -1, createdAt: -1 }).limit(limit).lean();
}

export async function getStandaloneArtworks() {
  await connectToDatabase();
  return Artwork.find({ status: "published", series: null }).sort({ order: 1, createdAt: -1 }).lean();
}

export async function getArtworksBySeriesId(seriesId: unknown) {
  await connectToDatabase();
  return Artwork.find({ status: "published", series: seriesId }).sort({ order: 1, createdAt: -1 }).lean();
}

export async function getArtworksByMediumSlug(slug: string) {
  await connectToDatabase();
  const medium = await Medium.findOne({ slug }).lean();
  if (!medium) return { medium: null, artworks: [] };
  const artworks = await Artwork.find({ status: "published", medium: medium._id })
    .sort({ order: 1, createdAt: -1 })
    .lean();
  return { medium, artworks };
}

export async function getArtworksBySubjectSlug(slug: string) {
  await connectToDatabase();
  const subject = await Subject.findOne({ slug }).lean();
  if (!subject) return { subject: null, artworks: [] };
  const artworks = await Artwork.find({ status: "published", subjects: subject._id })
    .sort({ order: 1, createdAt: -1 })
    .lean();
  return { subject, artworks };
}

export async function getArtworkBySlug(slug: string) {
  await connectToDatabase();
  return Artwork.findOne({ slug, status: "published" })
    .populate("medium")
    .populate("subjects")
    .populate("series")
    .lean();
}

export async function getPublishedExhibitions() {
  await connectToDatabase();
  return Exhibition.find({ status: "published" }).sort({ startDate: -1 }).lean();
}

export async function getExhibitionBySlug(slug: string) {
  await connectToDatabase();
  return Exhibition.findOne({ slug, status: "published" }).lean();
}

export async function getAbout() {
  await connectToDatabase();
  return About.findOne().lean();
}
