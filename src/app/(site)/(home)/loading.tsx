import type { CSSProperties } from "react";
import { Bone, ButtonBone, Line, SkeletonPage } from "@/components/skeleton/skeleton";

// Hero heading wraps to 6 lines on phones, 4 on tablets and 3 from lg. Line height is 1.02 of the
// font size (48px, then 72px at md).
const HEADING_LINES = [
  "w-full",
  "w-[88%]",
  "w-[94%]",
  "w-[60%] lg:hidden",
  "w-[70%] md:hidden",
  "w-[45%] md:hidden",
];

// Carousel tiles are 55svh tall, with their width following the picture's proportions.
const TILE_RATIOS = [0.8, 1.3, 0.8, 1, 0.8];

export default function HomeLoading() {
  return (
    <SkeletonPage label="Loading" className="flex flex-1 flex-col gap-24 py-16">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6">
        <div className="flex max-w-4xl flex-col">
          {HEADING_LINES.map((classes, index) => (
            <Line key={index} h="h-[49px] md:h-[73px]" width={classes} />
          ))}
        </div>
        <ButtonBone large width="w-40" />
      </section>

      <section className="flex flex-col gap-6">
        <div className="mx-auto flex w-full max-w-6xl items-end justify-between px-6">
          <Line h="h-4" width="w-28" />
          <Line h="h-5" width="w-20" />
        </div>
        <div className="flex w-full gap-8 overflow-hidden" style={{ "--h": "55svh" } as CSSProperties}>
          {TILE_RATIOS.map((ratio, index) => (
            <div
              key={index}
              className="flex shrink-0 flex-col gap-3"
              style={{ width: `calc(var(--h) * ${ratio})` }}
            >
              <Bone className="h-(--h) w-full" />
              <Line h="h-5" width="w-1/2" />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
        <Line h="h-4" width="w-36" />
        <div className="flex flex-wrap gap-3">
          <ButtonBone width="w-28" />
          <ButtonBone width="w-24" />
          <ButtonBone width="w-32" />
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 border-t border-border px-6 pt-12">
        <div className="flex max-w-3xl flex-col">
          <Line h="h-[38px] md:h-[60px]" />
          <Line h="h-[38px] md:h-[60px]" width="w-2/3" />
        </div>
        <ButtonBone large width="w-40" />
      </section>
    </SkeletonPage>
  );
}
