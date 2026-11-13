import { ArtworkCardBone, Bone, BreadcrumbBone, ButtonBone, Line, SkeletonPage } from "@/components/skeleton/skeleton";

// Follows GridCarousel: title, row, then button below xl; a title column beside the row at xl,
// with the arrow strip above. Tile width is the same clamp the real row uses.
export default function PortfolioLoading() {
  return (
    <SkeletonPage label="Loading portfolio" className="flex flex-1 flex-col gap-16 py-16">
      <div className="flex w-full flex-col px-6">
        <BreadcrumbBone />
      </div>

      <section className="flex flex-col gap-8 xl:grid xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start xl:gap-x-10 xl:gap-y-0 xl:pl-6">
        <div className="hidden h-11 xl:col-span-2 xl:col-start-1 xl:row-start-1 xl:block" />

        <div className="order-2 mx-6 flex min-w-0 gap-4 overflow-hidden xl:order-none xl:col-start-2 xl:row-start-2 xl:mx-0 xl:mr-6">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex w-[clamp(260px,70vw,340px)] shrink-0 flex-col gap-3 xl:w-[31vw]">
              <Bone className="aspect-[4/3] rounded-md" />
              <Line width="w-1/2" />
            </div>
          ))}
        </div>

        <div className="order-2 -mt-4 flex items-center justify-center gap-[14px] xl:order-none xl:col-start-2 xl:row-start-3 xl:mr-6 xl:pt-5">
          <Bone tone="border" className="h-1.5 w-4 rounded-full" />
          {Array.from({ length: 7 }, (_, index) => (
            <Bone key={index} tone="border" className="h-1.5 w-1.5 rounded-full" />
          ))}
        </div>

        <div className="contents xl:col-start-1 xl:row-start-2 xl:flex xl:flex-col xl:self-stretch">
          <header className="order-1 flex flex-col gap-4 px-6 xl:px-0 xl:pt-10">
            <Line h="h-[38px]" width="w-28" />
            <div className="flex flex-col">
              <Line />
              <Line width="w-2/3" />
            </div>
          </header>
          <div className="order-3 px-6 xl:px-0 xl:pt-8">
            <ButtonBone width="w-40" />
          </div>
        </div>
      </section>

      <div className="flex w-full flex-col gap-10 px-6">
        <header className="flex flex-col gap-3">
          <Line h="h-9" width="w-40" />
          <div className="flex max-w-2xl flex-col">
            <Line />
            <Line width="w-1/2 md:hidden" />
          </div>
        </header>

        {/* The filter bar is inline from md; below that it's a floating button, so nothing here. */}
        <div className="hidden gap-3 md:flex">
          <Bone tone="border" className="h-[38px] w-28 rounded-full" />
          <Bone tone="border" className="h-[38px] w-24 rounded-full" />
          <Bone tone="border" className="h-[38px] w-28 rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, index) => (
            <ArtworkCardBone key={index} />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
