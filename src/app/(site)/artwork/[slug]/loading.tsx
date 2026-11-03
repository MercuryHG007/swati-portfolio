import { Bone, BreadcrumbBone, Line, PrevNextBone, SkeletonPage } from "@/components/skeleton/skeleton";

// The gallery image takes the full width and its height follows the picture, so a 4/3 block stands
// in. Below it: title, meta row, subject pills, description and the series line.
export default function ArtworkLoading() {
  return (
    <SkeletonPage label="Loading artwork" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
      <BreadcrumbBone />
      <Bone className="aspect-[4/3] w-full rounded-md" />

      <div className="flex flex-col gap-3">
        <Line h="h-8" width="w-2/3 md:w-1/3" />
        <Line h="h-5" width="w-3/4 md:w-1/3" />
        <div className="flex gap-2">
          <Bone tone="border" className="h-[26px] w-16 rounded-full" />
          <Bone tone="border" className="h-[26px] w-20 rounded-full" />
        </div>
        <div className="flex max-w-2xl flex-col">
          <Line />
          <Line width="w-2/3" />
        </div>
        <Line h="h-5" width="w-1/2 md:w-1/4" />
      </div>

      <PrevNextBone />
    </SkeletonPage>
  );
}
