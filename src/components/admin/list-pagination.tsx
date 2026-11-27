import { PAGE_SIZES, type PageSize } from "@/lib/admin-list";
import { Select, secondaryButtonClass } from "@/components/admin/ui";

export function ListPagination({
  total,
  rangeStart,
  rangeEnd,
  page,
  pageCount,
  size,
  onPageChange,
  onSizeChange,
}: {
  total: number;
  rangeStart: number;
  rangeEnd: number;
  page: number;
  pageCount: number;
  size: PageSize;
  onPageChange: (page: number) => void;
  onSizeChange: (size: PageSize) => void;
}) {
  if (total === 0) return null;

  return (
    <nav aria-label="Pages" className="flex flex-col gap-3 text-sm text-muted">
      <div className="flex items-center justify-between gap-3">
        <span>
          {rangeStart}–{rangeEnd} of {total}
        </span>
        <div className="w-36">
          <Select
            aria-label="Items per page"
            value={size}
            onChange={(event) => onSizeChange(Number(event.target.value) as PageSize)}
          >
            {PAGE_SIZES.map((option) => (
              <option key={option} value={option}>
                {option} per page
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`${secondaryButtonClass} justify-self-start disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Previous
        </button>
        <span className="whitespace-nowrap text-center">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className={`${secondaryButtonClass} justify-self-end disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
