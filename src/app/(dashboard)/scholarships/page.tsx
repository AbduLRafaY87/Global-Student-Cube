import { ScholarshipFilterForm } from "@/components/forms/ScholarshipFilterForm";
import { createClient } from "@/lib/supabase/server";
import type { Scholarship, ScholarshipSearchFilters } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scholarships",
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toDateOnly(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return "";
  }

  return value.slice(0, 10);
}

function toScholarship(row: {
  id: unknown;
  title: unknown;
  provider: unknown;
  amount: unknown;
  country: unknown;
  minimum_gpa: unknown;
  deadline: unknown;
  application_url: unknown;
  created_at: unknown;
}): Scholarship | null {
  if (
    typeof row.id !== "string" ||
    typeof row.title !== "string" ||
    typeof row.provider !== "string" ||
    typeof row.country !== "string" ||
    typeof row.application_url !== "string"
  ) {
    return null;
  }

  const amount = toNumber(row.amount);
  const minimumGpa = toNumber(row.minimum_gpa);

  if (amount === null || minimumGpa === null) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    provider: row.provider,
    amount,
    country: row.country,
    minimum_gpa: minimumGpa,
    deadline: toDateOnly(row.deadline),
    application_url: row.application_url,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): ScholarshipSearchFilters {
  const country = firstParam(searchParams.country).trim();
  const minAmount = toNumber(firstParam(searchParams.min_amount));
  const filters: ScholarshipSearchFilters = {};

  if (country) {
    filters.country = country;
  }

  if (minAmount !== null) {
    filters.min_amount = minAmount;
  }

  return filters;
}

export default async function ScholarshipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const supabase = await createClient();

  let query = supabase
    .from("leftover_scholarships")
    .select(
      "id, title, provider, amount, country, minimum_gpa, deadline, application_url, created_at",
    )
    .order("deadline", { ascending: true });

  if (filters.country) {
    query = query.ilike("country", `%${filters.country}%`);
  }

  if (filters.min_amount !== undefined) {
    query = query.gte("amount", filters.min_amount);
  }

  const { data, error } = await query;
  const scholarships: Scholarship[] = [];

  if (data) {
    for (const row of data) {
      const scholarship = toScholarship(row);
      if (scholarship) {
        scholarships.push(scholarship);
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Financial aid
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Browse scholarships and filter by country and minimum award amount.
        </p>
      </header>

      <ScholarshipFilterForm filters={filters} />

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error.message}
        </p>
      ) : null}

      {scholarships.length === 0 && !error ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No scholarships match these filters.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scholarships.map((scholarship) => (
            <li
              key={scholarship.id}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                {scholarship.provider}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {scholarship.title}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {scholarship.country}
              </p>
              <dl className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <div className="flex justify-between gap-4">
                  <dt>Award</dt>
                  <dd className="font-medium">{scholarship.amount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Minimum GPA</dt>
                  <dd className="font-medium">{scholarship.minimum_gpa}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Deadline</dt>
                  <dd className="font-medium">{scholarship.deadline || "—"}</dd>
                </div>
              </dl>
              <a
                href={scholarship.application_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
              >
                Apply
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
