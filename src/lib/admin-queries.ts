import { connectToDatabase } from "@/lib/mongodb";
import { Series, Medium, Subject, Artwork, Exhibition, About, ContactMessage } from "@/models";

// Unlike src/lib/queries.ts (public site, published-only), these read every
// document regardless of status — used by the admin CRUD screens.

export async function getAllSeries() {
  await connectToDatabase();
  return Series.find().sort({ order: 1, title: 1 }).lean();
}

export async function getSeriesById(id: string) {
  await connectToDatabase();
  return Series.findById(id).lean();
}

export async function getAllMediums() {
  await connectToDatabase();
  return Medium.find().sort({ name: 1 }).lean();
}

export async function getAllSubjects() {
  await connectToDatabase();
  return Subject.find().sort({ name: 1 }).lean();
}

export async function getAllArtworks() {
  await connectToDatabase();
  return Artwork.find().sort({ order: 1, createdAt: -1 }).populate("medium").populate("series").lean();
}

export async function getArtworkById(id: string) {
  await connectToDatabase();
  return Artwork.findById(id).lean();
}

export async function getAllExhibitions() {
  await connectToDatabase();
  return Exhibition.find().sort({ startDate: -1 }).lean();
}

export async function getExhibitionById(id: string) {
  await connectToDatabase();
  return Exhibition.findById(id).lean();
}

export async function getOrCreateAbout() {
  await connectToDatabase();
  const existing = await About.findOne().lean();
  if (existing) return existing;
  const created = await About.create({});
  return created.toObject();
}

export async function getAllMessages() {
  await connectToDatabase();
  return ContactMessage.find().sort({ createdAt: -1 }).lean();
}

export async function getCounts() {
  await connectToDatabase();
  const [series, artworks, mediums, subjects, exhibitions, unreadMessages] = await Promise.all([
    Series.countDocuments(),
    Artwork.countDocuments(),
    Medium.countDocuments(),
    Subject.countDocuments(),
    Exhibition.countDocuments(),
    ContactMessage.countDocuments({ readAt: null }),
  ]);
  return { series, artworks, mediums, subjects, exhibitions, unreadMessages };
}
