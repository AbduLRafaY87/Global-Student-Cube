import { UniversityFilterForm } from "@/components/forms/UniversityFilterForm";
import { createClient } from "@/lib/supabase/server";
import type { University, UniversitySearchFilters } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Universities",
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

function toUniversity(row: {
  id: unknown;
  name: unknown;
  country: unknown;
  tuition_fee: unknown;
  acceptance_rate: unknown;
  minimum_gpa: unknown;
  ranking: unknown;
  created_at: unknown;
}): University | null {
  if (typeof row.id !== "string" || typeof row.name !== "string") {
    return null;
  }

  if (typeof row.country !== "string") {
    return null;
  }

  const tuitionFee = toNumber(row.tuition_fee);
  const acceptanceRate = toNumber(row.acceptance_rate);
  const minimumGpa = toNumber(row.minimum_gpa);
  const ranking = toNumber(row.ranking);

  if (
    tuitionFee === null ||
    acceptanceRate === null ||
    minimumGpa === null ||
    ranking === null
  ) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    country: row.country,
    tuition_fee: tuitionFee,
    acceptance_rate: acceptanceRate,
    minimum_gpa: minimumGpa,
    ranking: ranking,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): UniversitySearchFilters {
  const country = firstParam(searchParams.country).trim();
  const maxTuitionFee = toNumber(firstParam(searchParams.max_tuition_fee));
  const minimumGpa = toNumber(firstParam(searchParams.minimum_gpa));
  const filters: UniversitySearchFilters = {};

  if (country) {
    filters.country = country;
  }

  if (maxTuitionFee !== null) {
    filters.max_tuition_fee = maxTuitionFee;
  }

  if (minimumGpa !== null) {
    filters.minimum_gpa = minimumGpa;
  }

  return filters;
}

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const supabase = await createClient();

  let query = supabase
    .from("universities")
    .select(
      "id, name, country, tuition_fee, acceptance_rate, minimum_gpa, ranking, created_at",
    )
    .order("ranking", { ascending: true });

  if (filters.country) {
    query = query.ilike("country", `%${filters.country}%`);
  }

  if (filters.max_tuition_fee !== undefined) {
    query = query.lte("tuition_fee", filters.max_tuition_fee);
  }

  if (filters.minimum_gpa !== undefined) {
    query = query.lte("minimum_gpa", filters.minimum_gpa);
  }

  const { data, error } = await query;
  const universities: University[] = [];

  if (data) {
    for (const row of data) {
      const university = toUniversity(row);
      if (university) {
        universities.push(university);
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
          University directory
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Browse universities and narrow results by country, tuition budget, and
          GPA requirement.
        </p>
      </header>

      <UniversityFilterForm filters={filters} />

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error.message}
        </p>
      ) : null}

      {universities.length === 0 && !error ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No universities match these filters.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((university) => (
            <li
              key={university.id}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Rank {university.ranking}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {university.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {university.country}
              </p>
              <dl className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <div className="flex justify-between gap-4">
                  <dt>Tuition</dt>
                  <dd className="font-medium">{university.tuition_fee}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Acceptance rate</dt>
                  <dd className="font-medium">{university.acceptance_rate}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Minimum GPA</dt>
                  <dd className="font-medium">{university.minimum_gpa}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
