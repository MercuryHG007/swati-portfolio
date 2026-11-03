import { Line, SkeletonPage } from "@/components/skeleton/skeleton";

const BIO_LINES = ["w-full", "w-full", "w-[92%]", "w-full", "w-[85%]", "w-full", "w-[60%]"];

// Each row is a date (stacked above on phones, beside from md) plus a title and a detail line.
function CvSection({ rows }: { rows: number }) {
  return (
    <section className="flex flex-col gap-6 border-t border-border pt-6">
      <Line h="h-4" width="w-24" />
      <div className="flex flex-col gap-5">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="grid gap-1 md:grid-cols-[8rem_1fr]">
            <Line h="h-5" width="w-16" />
            <div className="flex flex-col gap-1">
              <Line width="w-5/6" />
              <Line h="h-5" width="w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AboutLoading() {
  return (
    <SkeletonPage label="Loading about" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
      <header className="flex flex-col gap-3">
        <Line h="h-12 md:h-[72px]" width="w-3/4 md:w-[45%]" />
        {/* Subtitle wraps to two lines on phones. */}
        <div className="flex flex-col">
          <Line h="h-7" width="w-full md:w-3/4" />
          <Line h="h-7" width="w-1/2 md:hidden" />
        </div>
      </header>

      <div className="grid gap-16 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex flex-col gap-14">
          <div className="flex max-w-2xl flex-col">
            {BIO_LINES.map((width, index) => (
              <Line key={index} h="h-[29px]" width={width} />
            ))}
          </div>
          <CvSection rows={3} />
          <CvSection rows={3} />
        </div>

        {/* The sidebar sits at the very bottom on phones, so it's left out there. */}
        <aside className="hidden flex-col gap-10 md:flex">
          <Line h="h-[38px]" width="w-44" />
          <div className="flex flex-col gap-3">
            <Line h="h-4" width="w-16" />
            <Line h="h-5" width="w-28" />
          </div>
        </aside>
      </div>
    </SkeletonPage>
  );
}
