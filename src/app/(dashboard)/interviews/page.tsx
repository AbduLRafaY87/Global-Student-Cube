import { InterviewForm } from "@/components/forms/InterviewForm";
import { enforceParkedRoute } from "@/server/legacy/parked";
import { createClient } from "@/lib/supabase/server";
import {
  INTERVIEW_STATUSES,
  type InterviewSession,
  type InterviewStatus,
  type University,
} from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interviews",
};

interface InterviewRow extends InterviewSession {
  university_name: string | null;
}

function parseInterviewStatus(value: unknown): InterviewStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const status of INTERVIEW_STATUSES) {
    if (status === value) {
      return status;
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

function formatSchedule(value: string): string {
  if (value.length >= 16) {
    return `${value.slice(0, 10)} ${value.slice(11, 16)}`;
  }

  return value || "—";
}

function toInterviewRow(row: {
  id: unknown;
  student_id: unknown;
  university_id: unknown;
  scheduled_at: unknown;
  interviewer_name: unknown;
  notes: unknown;
  status: unknown;
  created_at: unknown;
  universities: unknown;
}): InterviewRow | null {
  const status = parseInterviewStatus(row.status);

  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    typeof row.scheduled_at !== "string" ||
    typeof row.interviewer_name !== "string" ||
    !status
  ) {
    return null;
  }

  let universityName: string | null = null;
  if (
    typeof row.universities === "object" &&
    row.universities !== null &&
    !Array.isArray(row.universities) &&
    "name" in row.universities &&
    typeof row.universities.name === "string"
  ) {
    universityName = row.universities.name;
  }

  return {
    id: row.id,
    student_id: row.student_id,
    university_id: typeof row.university_id === "string" ? row.university_id : null,
    scheduled_at: row.scheduled_at,
    interviewer_name: row.interviewer_name,
    notes: typeof row.notes === "string" ? row.notes : "",
    status,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    university_name: universityName,
  };
}

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  enforceParkedRoute();
  const params = await searchParams;
  const editParam = params.edit;
  const editId = Array.isArray(editParam) ? editParam[0] : editParam;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const universities: Pick<University, "id" | "name" | "country">[] = [];
  const interviews: InterviewRow[] = [];

  const { data: universityRows } = await supabase
    .from("universities")
    .select("id, name, country")
    .order("name", { ascending: true })
    .limit(500);

  if (universityRows) {
    for (const row of universityRows) {
      const university = toUniversityOption(row);
      if (university) {
        universities.push(university);
      }
    }
  }

  if (user) {
    const { data: sessionRows } = await supabase
      .from("interview_sessions")
      .select(
        "id, student_id, university_id, scheduled_at, interviewer_name, notes, status, created_at, universities(name)",
      )
      .eq("student_id", user.id)
      .order("scheduled_at", { ascending: true });

    if (sessionRows) {
      for (const row of sessionRows) {
        const interview = toInterviewRow(row);
        if (interview) {
          interviews.push(interview);
        }
      }
    }
  }

  const editing = interviews.find((interview) => interview.id === editId);
  const upcoming = interviews.filter(
    (interview) => interview.status === "scheduled",
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Interview schedule
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Log interview dates, update notes, and track each session from
          scheduled to completed or canceled.
        </p>
      </header>

      <InterviewForm universities={universities} interview={editing ?? null} />

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Overview
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <li className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Upcoming
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
              {upcoming.length}
            </p>
          </li>
          {INTERVIEW_STATUSES.map((status) => (
            <li
              key={status}
              className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                {status}
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {interviews.filter((interview) => interview.status === status).length}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {interviews.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No interviews yet. Log one above.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {interviews.map((interview) => (
            <li
              key={interview.id}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                {interview.status}
                {interview.university_name
                  ? ` · ${interview.university_name}`
                  : ""}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {interview.interviewer_name}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {formatSchedule(interview.scheduled_at)}
              </p>
              {interview.notes ? (
                <p className="mt-3 line-clamp-3 text-sm text-zinc-700 dark:text-zinc-300">
                  {interview.notes}
                </p>
              ) : null}
              <Link
                href={`/interviews?edit=${interview.id}`}
                className="mt-4 text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
