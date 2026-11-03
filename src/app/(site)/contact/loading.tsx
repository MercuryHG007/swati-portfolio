import { Bone, ButtonBone, Line, SkeletonPage } from "@/components/skeleton/skeleton";

// Same narrow, vertically centred column as the real page. Field heights are the text-sm input
// (38px) and the five-row textarea (118px).
function Field({ inputHeight }: { inputHeight: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Line h="h-5" width="w-12" />
      <Bone className={`${inputHeight} rounded-md border border-border`} />
    </div>
  );
}

export default function ContactLoading() {
  return (
    <SkeletonPage
      label="Loading contact form"
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16"
    >
      <Line h="h-9" width="w-32" />
      <div className="flex flex-col">
        <Line />
        <Line width="w-2/3" />
      </div>
      <ButtonBone width="w-[217px]" />
      <div className="flex flex-col gap-4">
        <Field inputHeight="h-[38px]" />
        <Field inputHeight="h-[38px]" />
        <Field inputHeight="h-[118px]" />
        <ButtonBone width="w-36" />
      </div>
    </SkeletonPage>
  );
}
