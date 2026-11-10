import { unstable_cache } from "next/cache";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { seededShuffle } from "@/lib/portfolio-order";
import {
  PORTFOLIO_PAGE_SIZE,
  SIZE_BUCKETS,
  SIZE_KEYS,
  isSizeKey,
  type PortfolioFacets,
  type PortfolioFilters,
  type PortfolioPageResponse,
  type SizeKey,
} from "@/lib/portfolio-filters";
import { Series, Medium, Subject, Artwork, Exhibition, About, SeriesSettings } from "@/models";
import { SERIES_SETTINGS_DEFAULTS } from "@/models/SeriesSettings";

export async function getPublishedSeries() {
  await connectToDatabase();
  return Series.find({ status: "published" }).sort({ order: 1, title: 1 }).lean();
}

// Series shown in the portfolio carousel. Falls back to the latest published series when none are
// featured yet, the same way homepage artworks fall back to recent work.
export async function getFeaturedSeries(limit = 8) {
  await connectToDatabase();
  const featured = await Series.find({ status: "published", featured: true, coverImage: { $ne: null } })
    .sort({ order: 1, title: 1 })
    .limit(limit)
    .lean();
  if (featured.length > 0) return featured;
  return Series.find({ status: "published", coverImage: { $ne: null } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function getSeriesSettings() {
  await connectToDatabase();
  const settings = await SeriesSettings.findOne().lean();
  return { ...SERIES_SETTINGS_DEFAULTS, ...settings };
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

// Filters on the public site only list mediums and subjects that lead to at least one published artwork.
export async function getMediumsWithWork() {
  await connectToDatabase();
  const ids = await Artwork.distinct("medium", { status: "published" });
  return Medium.find({ _id: { $in: ids } }).sort({ name: 1 }).lean();
}

export async function getSubjectsWithWork() {
  await connectToDatabase();
  const ids = await Artwork.distinct("subjects", { status: "published" });
  return Subject.find({ _id: { $in: ids } }).sort({ name: 1 }).lean();
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
  // (by `dateMade`, not upload date — an artist may upload an older piece later).
  return Artwork.find({ status: "published" }).sort({ dateMade: -1, createdAt: -1 }).limit(limit).lean();
}

export async function getStandaloneArtworks() {
  await connectToDatabase();
  return Artwork.find({ status: "published", series: null }).sort({ order: 1, createdAt: -1 }).lean();
}

export async function getArtworksBySeriesId(seriesId: unknown) {
  await connectToDatabase();
  return Artwork.find({ status: "published", series: seriesId }).sort({ seriesOrder: 1, createdAt: -1 }).lean();
}

// Longest side in inches, whichever unit the artist entered the dimensions in.
const CM_PER_INCH = 2.54;
const LONGEST_SIDE_IN = {
  $multiply: [
    { $max: ["$dimensions.width", "$dimensions.height"] },
    { $cond: [{ $eq: ["$dimensions.unit", "cm"] }, 1 / CM_PER_INCH, 1] },
  ],
};

export type ResolvedPortfolioFilters = {
  // null = that filter is not applied. An empty array means a slug was requested but doesn't exist, so nothing matches.
  mediumIds: Types.ObjectId[] | null;
  subjectIds: Types.ObjectId[] | null;
  size: SizeKey[];
};

export async function resolvePortfolioFilters(filters: PortfolioFilters): Promise<ResolvedPortfolioFilters> {
  await connectToDatabase();
  const [mediums, subjects] = await Promise.all([
    filters.medium.length > 0 ? Medium.find({ slug: { $in: filters.medium } }).select("_id").lean() : null,
    filters.subject.length > 0 ? Subject.find({ slug: { $in: filters.subject } }).select("_id").lean() : null,
  ]);
  return {
    mediumIds: mediums ? mediums.map((medium) => medium._id) : null,
    subjectIds: subjects ? subjects.map((subject) => subject._id) : null,
    size: filters.size.filter(isSizeKey),
  };
}

function buildPortfolioMatch(resolved: ResolvedPortfolioFilters) {
  const match: Record<string, unknown> = { status: "published" };
  if (resolved.mediumIds) match.medium = { $in: resolved.mediumIds };
  if (resolved.subjectIds) match.subjects = { $in: resolved.subjectIds };
  if (resolved.size.length > 0) {
    // Works without dimensions can't be placed in a size bucket, so they only show when no size is selected.
    match["dimensions.width"] = { $gt: 0 };
    match["dimensions.height"] = { $gt: 0 };
    match.$or = resolved.size.map((key) => {
      const bounds: { min?: number; max?: number } = SIZE_BUCKETS[key];
      const { min, max } = bounds;
      const clauses: unknown[] = [];
      if (min !== undefined) clauses.push({ $gt: [LONGEST_SIDE_IN, min] });
      if (max !== undefined) clauses.push({ $lte: [LONGEST_SIDE_IN, max] });
      return { $expr: { $and: clauses } };
    });
  }
  return match;
}

// Every matching id is shuffled with the seed, then one page is loaded. The catalogue is small, so reading all ids
// per request is cheap. The same seed always gives the same pages, so paging stays consistent.
export async function getPortfolioPage(
  resolved: ResolvedPortfolioFilters,
  page: number,
  seed: string,
  pageSize = PORTFOLIO_PAGE_SIZE
): Promise<PortfolioPageResponse> {
  await connectToDatabase();
  const match = buildPortfolioMatch(resolved);
  const ids = await Artwork.find(match, { _id: 1 }).lean();
  const ordered = seededShuffle(
    ids.map((doc) => String(doc._id)),
    seed,
    (id) => id
  );
  const pageIds = ordered.slice((page - 1) * pageSize, page * pageSize);
  const docs = await Artwork.find({ _id: { $in: pageIds } }, { title: 1, slug: 1, images: { $slice: 1 } }).lean();
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  return {
    items: pageIds.flatMap((id) => {
      const artwork = byId.get(id);
      if (!artwork) return [];
      const image = artwork.images?.[0];
      return [
        {
          slug: artwork.slug,
          title: artwork.title,
          image: image
            ? { publicId: image.publicId, alt: image.alt, width: image.width, height: image.height }
            : null,
        },
      ];
    }),
    page,
    hasMore: page * pageSize < ordered.length,
    total: ordered.length,
    seed,
  };
}

// Each facet counts with the other filters applied, so an option only shows what it would add to the current selection.
export async function getPortfolioFacets(resolved: ResolvedPortfolioFilters): Promise<PortfolioFacets> {
  await connectToDatabase();
  const [mediums, subjects, mediumCounts, subjectCounts, sizeCounts] = await Promise.all([
    getMediumsWithWork(),
    getSubjectsWithWork(),
    Artwork.aggregate([
      { $match: buildPortfolioMatch({ ...resolved, mediumIds: null }) },
      { $group: { _id: "$medium", count: { $sum: 1 } } },
    ]),
    Artwork.aggregate([
      { $match: buildPortfolioMatch({ ...resolved, subjectIds: null }) },
      { $unwind: "$subjects" },
      { $group: { _id: "$subjects", count: { $sum: 1 } } },
    ]),
    Promise.all(SIZE_KEYS.map((key) => Artwork.countDocuments(buildPortfolioMatch({ ...resolved, size: [key] })))),
  ]);

  const mediumCountById = new Map(mediumCounts.map((row) => [String(row._id), row.count as number]));
  const subjectCountById = new Map(subjectCounts.map((row) => [String(row._id), row.count as number]));

  return {
    mediums: mediums.map((medium) => ({
      value: medium.slug,
      label: medium.name,
      count: mediumCountById.get(String(medium._id)) ?? 0,
    })),
    subjects: subjects.map((subject) => ({
      value: subject.slug,
      label: subject.name,
      count: subjectCountById.get(String(subject._id)) ?? 0,
    })),
    sizes: SIZE_KEYS.map((key, index) => ({
      value: key,
      label: SIZE_BUCKETS[key].label,
      hint: SIZE_BUCKETS[key].hint,
      count: sizeCounts[index],
    })),
  };
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
  const exhibition = await Exhibition.findOne({ slug, status: "published" })
    .populate({ path: "artworks", match: { status: "published" } })
    .lean();
  if (!exhibition) return null;
  // populate `match` leaves a null in place of any non-matching (hidden) artwork.
  return { ...exhibition, artworks: (exhibition.artworks ?? []).filter(Boolean) };
}

export async function getExhibitionsForArtwork(artworkId: unknown) {
  await connectToDatabase();
  return Exhibition.find({ status: "published", artworks: artworkId }).sort({ startDate: -1 }).lean();
}

export async function getAbout() {
  await connectToDatabase();
  return About.findOne().lean();
}

// Cached copies of everything the /portfolio page reads. The page depends on searchParams, so it
// can't be prerendered; caching the queries keeps it from hitting MongoDB on every visit. Admin
// actions call updateTag(PORTFOLIO_CACHE_TAG) so edits show up immediately, and the time-based
// revalidate is only a safety net. Results are JSON round-tripped, so only plain fields are returned.
export const PORTFOLIO_CACHE_TAG = "portfolio";
const PORTFOLIO_CACHE_SECONDS = 300;
const portfolioCacheOptions = { tags: [PORTFOLIO_CACHE_TAG], revalidate: PORTFOLIO_CACHE_SECONDS };

export const getCachedFeaturedSeriesCards = unstable_cache(
  async () => {
    const series = await getFeaturedSeries(8);
    return series.map((item) => ({
      slug: item.slug,
      title: item.title,
      image: item.coverImage ? { publicId: item.coverImage.publicId, alt: item.coverImage.alt } : null,
    }));
  },
  ["portfolio-featured-series"],
  portfolioCacheOptions
);

export const getCachedSeriesSettings = unstable_cache(
  async () => {
    const { heading, body, ctaLabel } = await getSeriesSettings();
    return { heading, body, ctaLabel };
  },
  ["portfolio-series-settings"],
  portfolioCacheOptions
);

export const getCachedPortfolioPage = unstable_cache(
  async (filters: PortfolioFilters, page: number, seed: string) =>
    getPortfolioPage(await resolvePortfolioFilters(filters), page, seed),
  ["portfolio-page"],
  portfolioCacheOptions
);

export const getCachedPortfolioFacets = unstable_cache(
  async (filters: PortfolioFilters) => getPortfolioFacets(await resolvePortfolioFilters(filters)),
  ["portfolio-facets"],
  portfolioCacheOptions
);
