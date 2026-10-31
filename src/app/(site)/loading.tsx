import { Line, SkeletonPage } from "@/components/skeleton/skeleton";

// Fallback for routes without their own loading file: a heading and a few lines of text.
export default function Loading() {
  return (
    <SkeletonPage label="Loading" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
      <Line h="h-9" width="w-40" />
      <div className="flex max-w-2xl flex-col">
        <Line />
        <Line />
        <Line width="w-2/3" />
      </div>
    </SkeletonPage>
  );
}
