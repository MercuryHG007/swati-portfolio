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
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <span>
        {rangeStart}–{rangeEnd} of {total}
      </span>
      <div className="flex items-center gap-2">
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
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Previous
        </button>
        <span className="whitespace-nowrap">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
