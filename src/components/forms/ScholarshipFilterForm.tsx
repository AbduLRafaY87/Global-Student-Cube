import Link from "next/link";
import type { ScholarshipSearchFilters } from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

interface ScholarshipFilterFormProps {
  filters: ScholarshipSearchFilters;
}

export function ScholarshipFilterForm({ filters }: ScholarshipFilterFormProps) {
  return (
    <form
      method="get"
      action="/scholarships"
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Country
          </label>
          <input
            id="country"
            name="country"
            type="text"
            defaultValue={filters.country ?? ""}
            placeholder="e.g. United States"
            className={inputClassName}
          />
        </div>

        <div>
          <label
            htmlFor="min_amount"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Minimum award amount
          </label>
          <input
            id="min_amount"
            name="min_amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            defaultValue={filters.min_amount ?? ""}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Apply filters
        </button>
        <Link
          href="/scholarships"
          className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}
