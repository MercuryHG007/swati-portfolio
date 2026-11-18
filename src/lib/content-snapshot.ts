import { after } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import * as queries from "@/lib/queries";
import { withLiveOnly } from "@/lib/resilient-read";
import { encodeSnapshotValue, writeContentSnapshot, type ContentSnapshot } from "@/lib/snapshot-store";
import { Artwork, Exhibition, Medium, Series, Subject } from "@/models";

type Slugged = { _id: unknown; slug: string };

// Runs each public read with the argument values the pages use, and records what the live database returns.
// Keys must match the arguments at the call sites: `resilient` keys on the function name plus JSON args.
export async function buildContentSnapshot(): Promise<ContentSnapshot> {
  return withLiveOnly(async () => {
    await connectToDatabase();

    const [series, artworks, exhibitions, mediums, subjects] = await Promise.all([
      Series.find({ status: "published" }).select("_id slug").lean<Slugged[]>(),
      Artwork.find({ status: "published" }).select("_id slug").lean<Slugged[]>(),
      Exhibition.find({ status: "published" }).select("_id slug").lean<Slugged[]>(),
      Medium.find().select("_id slug").lean<Slugged[]>(),
      Subject.find().select("_id slug").lean<Slugged[]>(),
    ]);

    const entries: Record<string, string> = {};
    const capture = async (name: string, args: unknown[], query: (...args: never[]) => Promise<unknown>) => {
      const value = await (query as (...args: unknown[]) => Promise<unknown>)(...args);
      entries[`${name}:${JSON.stringify(args)}`] = encodeSnapshotValue(value);
    };

    await Promise.all([
      capture("getPublishedSeries", [], queries.getPublishedSeries),
      capture("getFeaturedSeries", [8], queries.getFeaturedSeries),
      capture("getSeriesSettings", [], queries.getSeriesSettings),
      capture("getHomeSettings", [], queries.getHomeSettings),
      capture("getMediums", [], queries.getMediums),
      capture("getSubjects", [], queries.getSubjects),
      capture("getMediumsWithWork", [], queries.getMediumsWithWork),
      capture("getSubjectsWithWork", [], queries.getSubjectsWithWork),
      capture("getFeaturedArtworks", [1], queries.getFeaturedArtworks),
      capture("getFeaturedArtworks", [8], queries.getFeaturedArtworks),
      capture("getStandaloneArtworks", [], queries.getStandaloneArtworks),
      capture("getPortfolioCatalogue", [], queries.getPortfolioCatalogue),
      capture("getPublishedExhibitions", [], queries.getPublishedExhibitions),
      capture("getAbout", [], queries.getAbout),
      capture("getPublishedFaqs", [], queries.getPublishedFaqs),
      capture("getSitemapEntries", [], queries.getSitemapEntries),
      capture("getLlmsContent", [], queries.getLlmsContent),
      ...mediums.map((medium) => capture("getMediumBySlug", [medium.slug], queries.getMediumBySlug)),
      ...subjects.map((subject) => capture("getSubjectBySlug", [subject.slug], queries.getSubjectBySlug)),
      ...series.flatMap((item) => [
        capture("getSeriesBySlug", [item.slug], queries.getSeriesBySlug),
        capture("getArtworksBySeriesId", [item._id], queries.getArtworksBySeriesId),
      ]),
      ...artworks.flatMap((artwork) => [
        capture("getArtworkBySlug", [artwork.slug], queries.getArtworkBySlug),
        capture("getExhibitionsForArtwork", [artwork._id], queries.getExhibitionsForArtwork),
      ]),
      ...exhibitions.map((exhibition) => capture("getExhibitionBySlug", [exhibition.slug], queries.getExhibitionBySlug)),
    ]);

    return { generatedAt: new Date().toISOString(), artworkCount: artworks.length, entries };
  });
}

export async function refreshContentSnapshot() {
  const snapshot = await buildContentSnapshot();
  await writeContentSnapshot(snapshot);
  return snapshot;
}

// Called from admin actions. Runs after the response, so saving in admin stays fast.
export function scheduleSnapshotRefresh() {
  after(async () => {
    try {
      await refreshContentSnapshot();
    } catch (err) {
      console.error("Content snapshot refresh failed:", err);
    }
  });
}
