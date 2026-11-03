import { BreadcrumbBone, Line, PrevNextBone, SkeletonPage } from "@/components/skeleton/skeleton";

// The heading is 36px on phones and 60px from md with 1.25 line height: three lines up to lg, two
// after. The venue wraps to two lines on phones. Images, artworks and the description are optional
// on the real page, so only the header and the prev/next row are drawn.
export default function ExhibitionLoading() {
  return (
    <SkeletonPage
      label="Loading exhibition"
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16"
    >
      <BreadcrumbBone />

      <header className="flex flex-col gap-4">
        <Line h="h-4" width="w-32" />
        <div className="flex flex-col">
          <Line h="h-[45px] md:h-[75px]" />
          <Line h="h-[45px] md:h-[75px]" width="w-[85%]" />
          <Line h="h-[45px] md:h-[75px]" width="w-[50%] lg:hidden" />
        </div>
        <div className="flex flex-col">
          <Line h="h-7" width="w-full md:w-1/2" />
          <Line h="h-7" width="w-1/2 md:hidden" />
        </div>
        <Line width="w-32" />
      </header>

      <PrevNextBone />
    </SkeletonPage>
  );
}
