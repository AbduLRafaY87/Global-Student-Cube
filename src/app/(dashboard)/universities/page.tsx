import { UniversityFilterForm } from "@/components/forms/UniversityFilterForm";
import { catalogPage } from "@/domain/catalog/catalog";
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
  city: unknown;
  slug: unknown;
  type: unknown;
  website_url: unknown;
}): University | null {
  if (typeof row.id !== "string" || typeof row.name !== "string") {
    return null;
  }

  if (typeof row.country !== "string") {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    country: row.country,
    city: typeof row.city === "string" ? row.city : null,
    slug: typeof row.slug === "string" ? row.slug : undefined,
    type: typeof row.type === "string" ? row.type : null,
    website_url: typeof row.website_url === "string" ? row.website_url : null,
  };
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): UniversitySearchFilters {
  const q = firstParam(searchParams.q).trim();
  const country = firstParam(searchParams.country).trim();
  const city = firstParam(searchParams.city).trim();
  const page = catalogPage(
    toNumber(firstParam(searchParams.limit)) ?? undefined,
    toNumber(firstParam(searchParams.offset)) ?? undefined,
  );
  const filters: UniversitySearchFilters = {
    limit: page.limit,
    offset: page.offset,
  };

  if (q) {
    filters.q = q;
  }

  if (country) {
    filters.country = country;
  }

  if (city) {
    filters.city = city;
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
    .from("catalog_universities_public")
    .select("id, name, slug, country, city, type, website_url")
    .order("name", { ascending: true })
    .range(
      filters.offset ?? 0,
      (filters.offset ?? 0) + (filters.limit ?? 20) - 1,
    );

  if (filters.q) {
    query = query.ilike("name", `%${filters.q}%`);
  }

  if (filters.country) {
    query = query.ilike("country", `%${filters.country}%`);
  }

  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
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

  const hasFilters = Boolean(filters.q || filters.country || filters.city);

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
          Published universities only. Missing facts show as Not provided, never
          as a waived requirement or an admission probability.
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
          {hasFilters
            ? "No universities match these filters."
            : "No universities are published yet."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((university) => (
            <li
              key={university.id}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {university.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {university.city ?? "Not provided"}, {university.country}
              </p>
              <dl className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <div className="flex justify-between gap-4">
                  <dt>Type</dt>
                  <dd className="font-medium">
                    {university.type ?? "Not provided"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Website</dt>
                  <dd className="font-medium">
                    {university.website_url ?? "Not provided"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
