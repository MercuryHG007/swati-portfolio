import { connectToDatabase } from "@/lib/mongodb";
import { Series, Medium, Subject, Artwork, Exhibition, About, ContactMessage, Faq } from "@/models";

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

export async function getArtworksBySeriesIdAdmin(seriesId: string) {
  await connectToDatabase();
  return Artwork.find({ series: seriesId }).sort({ seriesOrder: 1, createdAt: -1 }).lean();
}

// Subjects with the number of artworks tagged with each one, for the admin filters.
export async function getAllSubjectsWithArtworkCount() {
  await connectToDatabase();
  const [subjects, usage] = await Promise.all([
    Subject.find().sort({ name: 1 }).lean(),
    Artwork.aggregate<{ _id: unknown; artworks: unknown[] }>([
      { $unwind: "$subjects" },
      { $group: { _id: "$subjects", artworks: { $addToSet: "$_id" } } },
    ]),
  ]);
  const counts = new Map(usage.map((row) => [String(row._id), row.artworks.length]));
  return subjects.map((subject) => ({ ...subject, artworkCount: counts.get(String(subject._id)) ?? 0 }));
}

export async function getAllMediums() {
  await connectToDatabase();
  return Medium.find().sort({ name: 1 }).lean();
}

export async function getAllSubjects() {
  await connectToDatabase();
  return Subject.find().sort({ name: 1 }).lean();
}

export async function getAllFaqs() {
  await connectToDatabase();
  return Faq.find().sort({ order: 1, createdAt: 1 }).lean();
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
  const [series, artworks, exhibitions, unreadMessages, hiddenArtworks, hiddenExhibitions, hiddenFaqs] =
    await Promise.all([
      Series.countDocuments(),
      Artwork.countDocuments(),
      Exhibition.countDocuments(),
      ContactMessage.countDocuments({ readAt: null }),
      Artwork.countDocuments({ status: "hidden" }),
      Exhibition.countDocuments({ status: "hidden" }),
      Faq.countDocuments({ status: "hidden" }),
    ]);
  return { series, artworks, exhibitions, unreadMessages, hiddenArtworks, hiddenExhibitions, hiddenFaqs };
}
