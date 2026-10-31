import Link from "next/link";
import { getAllExhibitions } from "@/lib/admin-queries";
import { formatDateRange } from "@/lib/format";
import { ExhibitionList, type ExhibitionRow } from "./exhibition-list";
import { buttonClass } from "@/components/admin/ui";

export default async function AdminExhibitionsListPage() {
  const exhibitions = await getAllExhibitions();
  const rows: ExhibitionRow[] = exhibitions.map((exhibition) => ({
    id: String(exhibition._id),
    title: exhibition.title,
    venue: exhibition.venue,
    status: exhibition.status,
    range: formatDateRange(exhibition.startDate, exhibition.endDate),
    startTime: new Date(exhibition.startDate).getTime(),
  }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Exhibitions</h1>
        <Link href="/admin/exhibitions/new" className={buttonClass}>
          New exhibition
        </Link>
      </div>

      <ExhibitionList exhibitions={rows} />
    </main>
  );
}

