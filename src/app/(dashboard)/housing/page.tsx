import { HousingCard } from "@/components/HousingCard";
import { createClient } from "@/lib/supabase/server";
import {
  HOUSING_TYPES,
  type HousingOption,
  type HousingType,
} from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Housing",
};

interface HousingRow extends HousingOption {
  university_name: string;
  university_country: string;
}

interface UniversityGroup {
  id: string;
  name: string;
  country: string;
  options: HousingRow[];
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

function parseHousingType(value: unknown): HousingType | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const housingType of HOUSING_TYPES) {
    if (housingType === value) {
      return housingType;
    }
  }

  return null;
}

function toHousingRow(row: {
  id: unknown;
  university_id: unknown;
  title: unknown;
  housing_type: unknown;
  monthly_cost: unknown;
  address: unknown;
  created_at: unknown;
  universities: unknown;
}): HousingRow | null {
  const housingType = parseHousingType(row.housing_type);
  const monthlyCost = toNumber(row.monthly_cost);

  if (
    typeof row.id !== "string" ||
    typeof row.university_id !== "string" ||
    typeof row.title !== "string" ||
    typeof row.address !== "string" ||
    !housingType ||
    monthlyCost === null
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
    university_id: row.university_id,
    title: row.title,
    housing_type: housingType,
    monthly_cost: monthlyCost,
    address: row.address,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    university_name: universityName,
    university_country: universityCountry,
  };
}

function groupByUniversity(rows: HousingRow[]): UniversityGroup[] {
  const groups = new Map<string, UniversityGroup>();

  for (const row of rows) {
    const current = groups.get(row.university_id);

    if (current) {
      current.options.push(row);
      continue;
    }

    groups.set(row.university_id, {
      id: row.university_id,
      name: row.university_name,
      country: row.university_country,
      options: [row],
    });
  }

  return [...groups.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export default async function HousingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const universityFilter = firstParam(params.university).trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const universityIds: string[] = [];
  const housingRows: HousingRow[] = [];

  if (user) {
    const { data: applicationRows } = await supabase
      .from("applications")
      .select("university_id")
      .eq("student_id", user.id);

    if (applicationRows) {
      for (const row of applicationRows) {
        if (
          typeof row.university_id === "string" &&
          !universityIds.includes(row.university_id)
        ) {
          universityIds.push(row.university_id);
        }
      }
    }

    if (universityIds.length > 0) {
      const { data: optionRows } = await supabase
        .from("housing_options")
        .select(
          "id, university_id, title, housing_type, monthly_cost, address, created_at, universities(name, country)",
        )
        .in("university_id", universityIds)
        .order("monthly_cost", { ascending: true });

      if (optionRows) {
        for (const row of optionRows) {
          const option = toHousingRow(row);
          if (option) {
            housingRows.push(option);
          }
        }
      }
    }
  }

  const allGroups = groupByUniversity(housingRows);
  const groups = universityFilter
    ? allGroups.filter((group) => group.id === universityFilter)
    : allGroups;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Housing directory
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Browse on-campus, off-campus, and shared housing for universities on
          your application list.
        </p>
      </header>

      {universityIds.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Save a university on the{" "}
          <Link
            href="/applications"
            className="font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
          >
            applications
          </Link>{" "}
          tracker to see housing options.
        </p>
      ) : (
        <>
          {allGroups.length > 1 ? (
            <nav
              className="flex flex-wrap gap-2"
              aria-label="Saved university housing"
            >
              <Link
                href="/housing"
                className={
                  universityFilter
                    ? "rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    : "rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                }
              >
                All saved universities
              </Link>
              {allGroups.map((group) => {
                const isActive = universityFilter === group.id;

                return (
                  <Link
                    key={group.id}
                    href={`/housing?university=${group.id}`}
                    className={
                      isActive
                        ? "rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    }
                  >
                    {group.name}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {groups.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No housing options listed for your saved universities yet.
            </p>
          ) : (
            <div className="flex flex-col gap-8">
              {groups.map((group) => (
                <section key={group.id} className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {group.name}
                    {group.country ? (
                      <span className="ml-2 text-sm font-normal text-zinc-600 dark:text-zinc-400">
                        {group.country}
                      </span>
                    ) : null}
                  </h2>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.options.map((option) => (
                      <li key={option.id}>
                        <HousingCard
                          option={option}
                          universityName={option.university_name}
                          country={option.university_country}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
