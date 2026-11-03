import { Bone, BreadcrumbBone, Line, SkeletonPage } from "@/components/skeleton/skeleton";

// One column on phones, two from sm. Cards are a 16/10 cover, a title and two description lines.
export default function SeriesLoading() {
  return (
    <SkeletonPage label="Loading series" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
      <BreadcrumbBone />
      <Line h="h-9" width="w-32" />
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index}>
            <Bone className="aspect-[16/10] rounded-md" />
            <Line width="w-2/3" className="mt-3" />
            <Line h="h-5" className="mt-1" />
            <Line h="h-5" width="w-3/4" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
