import {
  ArtworkCardBone,
  BreadcrumbBone,
  Line,
  PrevNextBone,
  SkeletonPage,
} from "@/components/skeleton/skeleton";

// Two columns on phones, three from md, like the real grid.
export default function SeriesDetailLoading() {
  return (
    <SkeletonPage label="Loading series" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
      <BreadcrumbBone />
      <header className="flex flex-col gap-3">
        <Line h="h-9" width="w-48" />
      </header>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <ArtworkCardBone key={index} />
        ))}
      </div>
      <PrevNextBone />
    </SkeletonPage>
  );
}
