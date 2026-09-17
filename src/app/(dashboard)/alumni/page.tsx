import { AlumniCard } from "@/components/AlumniCard";
import {
  AlumniFilterForm,
  type AlumniSearchFilters,
} from "@/components/forms/AlumniFilterForm";
import { createClient } from "@/lib/supabase/server";
import type { AlumniProfile, University } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alumni",
};

interface AlumniRow extends AlumniProfile {
  university_name: string;
  university_country: string;
}

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

function toUniversityOption(row: {
  id: unknown;
  name: unknown;
  country: unknown;
}): Pick<University, "id" | "name" | "country"> | null {
  if (typeof row.id !== "string" || typeof row.name !== "string") {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    country: typeof row.country === "string" ? row.country : "",
  };
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AlumniSearchFilters {
  const name = firstParam(searchParams.name).trim();
  const universityId = firstParam(searchParams.university_id).trim();
  const graduationYear = toNumber(firstParam(searchParams.graduation_year));
  const currentCompany = firstParam(searchParams.current_company).trim();
  const filters: AlumniSearchFilters = {};

  if (name) {
    filters.name = name;
  }

  if (universityId) {
    filters.university_id = universityId;
  }

  if (graduationYear !== null) {
    filters.graduation_year = graduationYear;
  }

  if (currentCompany) {
    filters.current_company = currentCompany;
  }

  return filters;
}

function toAlumniRow(row: {
  id: unknown;
  name: unknown;
  university_id: unknown;
  graduation_year: unknown;
  current_company: unknown;
  linkedin_url: unknown;
  created_at: unknown;
  universities: unknown;
}): AlumniRow | null {
  const graduationYear = toNumber(row.graduation_year);

  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.university_id !== "string" ||
    typeof row.current_company !== "string" ||
    typeof row.linkedin_url !== "string" ||
    graduationYear === null
  ) {
    return null;
  }

  let universityName = "Unknown university";
  let universityCountry = "";

  if (
    typeof row.universities === "object" &&
    row.universities !== null &&
    !Array.isArray(row.universities)
  ) {
    if ("name" in row.universities && typeof row.universities.name === "string") {
      universityName = row.universities.name;
    }
    if (
      "country" in row.universities &&
      typeof row.universities.country === "string"
    ) {
      universityCountry = row.universities.country;
    }
  }

  return {
    id: row.id,
    name: row.name,
    university_id: row.university_id,
    graduation_year: graduationYear,
    current_company: row.current_company,
    linkedin_url: row.linkedin_url,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    university_name: universityName,
    university_country: universityCountry,
  };
}

export default async function AlumniPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const supabase = await createClient();

  const universities: Pick<University, "id" | "name" | "country">[] = [];
  const alumni: AlumniRow[] = [];

  const { data: universityRows } = await supabase
    .from("universities")
    .select("id, name, country")
    .order("name", { ascending: true });

  if (universityRows) {
    for (const row of universityRows) {
      const university = toUniversityOption(row);
      if (university) {
        universities.push(university);
      }
    }
  }

  let query = supabase
    .from("alumni_profiles")
    .select(
      "id, name, university_id, graduation_year, current_company, linkedin_url, created_at, universities(name, country)",
    )
    .order("graduation_year", { ascending: false })
    .order("name", { ascending: true });

  if (filters.name) {
    query = query.ilike("name", `%${filters.name}%`);
  }

  if (filters.university_id) {
    query = query.eq("university_id", filters.university_id);
  }

  if (filters.graduation_year !== undefined) {
    query = query.eq("graduation_year", filters.graduation_year);
  }

  if (filters.current_company) {
    query = query.ilike("current_company", `%${filters.current_company}%`);
  }

  const { data, error } = await query;

  if (data) {
    for (const row of data) {
      const profile = toAlumniRow(row);
      if (profile) {
        alumni.push(profile);
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
          Alumni network
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Search alumni by name, university, graduation year, or company, then
          connect on LinkedIn.
        </p>
      </header>

      <AlumniFilterForm filters={filters} universities={universities} />

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error.message}
        </p>
      ) : null}

      {alumni.length === 0 && !error ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No alumni match these filters.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alumni.map((profile) => (
            <li key={profile.id}>
              <AlumniCard
                alumni={profile}
                universityName={profile.university_name}
                country={profile.university_country}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
