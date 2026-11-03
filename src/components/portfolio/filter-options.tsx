import type { FacetOption, FilterKey, PortfolioFacets } from "@/lib/portfolio-filters";

export const FILTER_LABELS: Record<FilterKey, string> = { medium: "Medium", subject: "Subject", size: "Size" };

export function optionsFor(key: FilterKey, facets: PortfolioFacets): FacetOption[] {
  if (key === "medium") return facets.mediums;
  if (key === "subject") return facets.subjects;
  return facets.sizes;
}

// Medium only appears when there is a real choice between two or more mediums.
export function visibleFilterKeys(facets: PortfolioFacets): FilterKey[] {
  const keys: FilterKey[] = [];
  if (facets.mediums.length >= 2) keys.push("medium");
  if (facets.subjects.length > 0) keys.push("subject");
  keys.push("size");
  return keys;
}

export function pillText(key: FilterKey, value: string, facets: PortfolioFacets) {
  const option = optionsFor(key, facets).find((item) => item.value === value);
  if (!option) return value;
  return option.hint ? `${option.label} · ${option.hint}` : option.label;
}

type FilterOptionsProps = {
  name: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
};

export function FilterOptions({ name, options, selected, onToggle }: FilterOptionsProps) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => {
        const checked = selected.includes(option.value);
        // Zero-count options are disabled, but stay enabled while checked so they can be unticked.
        const disabled = option.count === 0 && !checked;
        return (
          <label
            key={option.value}
            className={`flex items-center gap-2 text-sm text-foreground ${disabled ? "cursor-default opacity-40" : "cursor-pointer"}`}
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(option.value)}
              className="size-4 shrink-0 accent-accent"
            />
            <span>{option.label}</span>
            {option.hint && <span className="whitespace-nowrap text-xs text-muted">{option.hint}</span>}
            <span className="whitespace-nowrap text-xs text-muted">({option.count})</span>
          </label>
        );
      })}
    </div>
  );
}
