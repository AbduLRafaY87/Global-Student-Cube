import Link from "next/link";
import type { University } from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

export interface AlumniSearchFilters {
  name?: string;
  university_id?: string;
  graduation_year?: number;
  current_company?: string;
}

interface AlumniFilterFormProps {
  filters: AlumniSearchFilters;
  universities: Pick<University, "id" | "name" | "country">[];
}

export function AlumniFilterForm({
  filters,
  universities,
}: AlumniFilterFormProps) {
  return (
    <form
      method="get"
      action="/alumni"
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={filters.name ?? ""}
            placeholder="Search by name"
            className={inputClassName}
          />
        </div>

        <div>
          <label
            htmlFor="university_id"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            University
          </label>
          <select
            id="university_id"
            name="university_id"
            defaultValue={filters.university_id ?? ""}
            className={inputClassName}
          >
            <option value="">All universities</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
                {university.country ? ` · ${university.country}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="graduation_year"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Graduation year
          </label>
          <input
            id="graduation_year"
            name="graduation_year"
            type="number"
            inputMode="numeric"
            min="1900"
            step="1"
            defaultValue={filters.graduation_year ?? ""}
            className={inputClassName}
          />
        </div>

        <div>
          <label
            htmlFor="current_company"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Company
          </label>
          <input
            id="current_company"
            name="current_company"
            type="text"
            defaultValue={filters.current_company ?? ""}
            placeholder="Search by company"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Search alumni
        </button>
        <Link
          href="/alumni"
          className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}
