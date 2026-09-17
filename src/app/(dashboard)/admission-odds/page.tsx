import { OddsCalculatorCard } from "@/components/OddsCalculatorCard";
import { calculateAdmissionOdds } from "@/lib/admission-calculator";
import { createClient } from "@/lib/supabase/server";
import {
  APPLICATION_STATUSES,
  type AdmissionOddsCategory,
  type ApplicationStatus,
} from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admission odds",
};

interface OddsRow {
  id: string;
  universityName: string;
  country: string;
  applicationStatus: ApplicationStatus;
  minimumGpa: number;
  acceptanceRate: number;
  category: AdmissionOddsCategory;
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

function parseApplicationStatus(value: unknown): ApplicationStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const status of APPLICATION_STATUSES) {
    if (status === value) {
      return status;
    }
  }

  return null;
}

function toOddsRow(
  row: {
    id: unknown;
    status: unknown;
    universities: unknown;
  },
  studentGpa: number,
): OddsRow | null {
  const status = parseApplicationStatus(row.status);

  if (typeof row.id !== "string" || !status) {
    return null;
  }

  if (
    typeof row.universities !== "object" ||
    row.universities === null ||
    Array.isArray(row.universities)
  ) {
    return null;
  }

  const university = row.universities;
  const minimumGpa =
    "minimum_gpa" in university ? toNumber(university.minimum_gpa) : null;
  const acceptanceRate =
    "acceptance_rate" in university
      ? toNumber(university.acceptance_rate)
      : null;

  if (minimumGpa === null || acceptanceRate === null) {
    return null;
  }

  const universityName =
    "name" in university && typeof university.name === "string"
      ? university.name
      : "Unknown university";
  const country =
    "country" in university && typeof university.country === "string"
      ? university.country
      : "";

  return {
    id: row.id,
    universityName,
    country,
    applicationStatus: status,
    minimumGpa,
    acceptanceRate,
    category: calculateAdmissionOdds({
      studentGpa,
      minimumGpa,
      acceptanceRate,
    }),
  };
}

export default async function AdmissionOddsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let studentGpa: number | null = null;
  const rows: OddsRow[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from("student_profiles")
      .select("gpa")
      .eq("user_id", user.id)
      .maybeSingle();

    studentGpa = toNumber(profile?.gpa);

    if (studentGpa !== null) {
      const { data: applicationRows } = await supabase
        .from("applications")
        .select(
          "id, status, universities(name, country, minimum_gpa, acceptance_rate)",
        )
        .eq("student_id", user.id)
        .order("deadline", { ascending: true });

      if (applicationRows) {
        for (const row of applicationRows) {
          const oddsRow = toOddsRow(row, studentGpa);
          if (oddsRow) {
            rows.push(oddsRow);
          }
        }
      }
    }
  }

  const saved = rows.filter((row) => row.applicationStatus === "draft");
  const applied = rows.filter((row) => row.applicationStatus !== "draft");
  const categoryCounts: Record<AdmissionOddsCategory, number> = {
    Reach: rows.filter((row) => row.category === "Reach").length,
    Match: rows.filter((row) => row.category === "Match").length,
    Safety: rows.filter((row) => row.category === "Safety").length,
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Admission odds
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Compare your GPA with each saved or applied university&apos;s minimum
          GPA and acceptance rate.
        </p>
      </header>

      {studentGpa === null ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Add your GPA on the{" "}
          <Link
            href="/profile"
            className="font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
          >
            student profile
          </Link>{" "}
          page to calculate admission odds.
        </p>
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              List mix
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Your GPA: {studentGpa.toFixed(2)}
            </p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-3">
              {(["Reach", "Match", "Safety"] as const).map((category) => (
                <li
                  key={category}
                  className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    {category}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                    {categoryCounts[category]}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {rows.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No saved or applied universities yet. Add schools on the{" "}
              <Link
                href="/applications"
                className="font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
              >
                applications
              </Link>{" "}
              tracker.
            </p>
          ) : (
            <>
              {saved.length > 0 ? (
                <section className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    Saved
                  </h2>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {saved.map((row) => (
                      <li key={row.id}>
                        <OddsCalculatorCard
                          universityName={row.universityName}
                          country={row.country}
                          applicationStatus={row.applicationStatus}
                          studentGpa={studentGpa}
                          minimumGpa={row.minimumGpa}
                          acceptanceRate={row.acceptanceRate}
                          category={row.category}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {applied.length > 0 ? (
                <section className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    Applied
                  </h2>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {applied.map((row) => (
                      <li key={row.id}>
                        <OddsCalculatorCard
                          universityName={row.universityName}
                          country={row.country}
                          applicationStatus={row.applicationStatus}
                          studentGpa={studentGpa}
                          minimumGpa={row.minimumGpa}
                          acceptanceRate={row.acceptanceRate}
                          category={row.category}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
