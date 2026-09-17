import Link from "next/link";
import type { UniversitySearchFilters } from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

interface UniversityFilterFormProps {
  filters: UniversitySearchFilters;
}

export function UniversityFilterForm({ filters }: UniversityFilterFormProps) {
  return (
    <form
      method="get"
      action="/universities"
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="grid gap-4 sm:grid-cols-3">
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
            placeholder="e.g. Canada"
            className={inputClassName}
          />
        </div>

        <div>
          <label
            htmlFor="max_tuition_fee"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Max tuition fee
          </label>
          <input
            id="max_tuition_fee"
            name="max_tuition_fee"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            defaultValue={filters.max_tuition_fee ?? ""}
            className={inputClassName}
          />
        </div>

        <div>
          <label
            htmlFor="minimum_gpa"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Minimum GPA
          </label>
          <input
            id="minimum_gpa"
            name="minimum_gpa"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            defaultValue={filters.minimum_gpa ?? ""}
            className={inputClassName}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Shows universities whose requirement is at most this GPA.
          </p>
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
          href="/universities"
          className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}
