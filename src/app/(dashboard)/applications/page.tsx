import {
  deleteApplication,
  updateApplicationStatus,
} from "@/app/(dashboard)/applications/actions";
import { ApplicationForm } from "@/components/forms/ApplicationForm";
import { createClient } from "@/lib/supabase/server";
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
  type University,
} from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Applications",
};

interface ApplicationRow extends Application {
  university_name: string;
  university_country: string;
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

function toDateOnly(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return "";
  }

  return value.slice(0, 10);
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

function toApplicationRow(row: {
  id: unknown;
  student_id: unknown;
  university_id: unknown;
  status: unknown;
  deadline: unknown;
  created_at: unknown;
  updated_at: unknown;
  universities: unknown;
}): ApplicationRow | null {
  const status = parseApplicationStatus(row.status);

  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    typeof row.university_id !== "string" ||
    !status
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
    if (
      "name" in row.universities &&
      typeof row.universities.name === "string"
    ) {
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
    student_id: row.student_id,
    university_id: row.university_id,
    status,
    deadline: toDateOnly(row.deadline),
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
    university_name: universityName,
    university_country: universityCountry,
  };
}

function daysUntil(deadline: string, today: string): number | null {
  if (!deadline) {
    return null;
  }

  const start = Date.parse(`${today}T00:00:00`);
  const end = Date.parse(`${deadline}T00:00:00`);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }

  return Math.round((end - start) / 86_400_000);
}

function deadlineLabel(days: number | null): string {
  if (days === null) {
    return "No deadline";
  }

  if (days < 0) {
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  }

  if (days === 0) {
    return "Due today";
  }

  return `${days} day${days === 1 ? "" : "s"} left`;
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const editParam = params.edit;
  const editId = Array.isArray(editParam) ? editParam[0] : editParam;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const universities: Pick<University, "id" | "name" | "country">[] = [];
  const applications: ApplicationRow[] = [];

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

  if (user) {
    const { data: applicationRows } = await supabase
      .from("applications")
      .select(
        "id, student_id, university_id, status, deadline, created_at, updated_at, universities(name, country)",
      )
      .eq("student_id", user.id)
      .order("deadline", { ascending: true });

    if (applicationRows) {
      for (const row of applicationRows) {
        const application = toApplicationRow(row);
        if (application) {
          applications.push(application);
        }
      }
    }
  }

  const editing = applications.find((application) => application.id === editId);
  const today = new Date().toISOString().slice(0, 10);
  const openApplications = applications.filter(
    (application) =>
      application.status === "draft" || application.status === "submitted",
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Application tracker
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Add applications, update their status, and watch upcoming deadlines.
        </p>
      </header>

      <ApplicationForm
        universities={universities}
        application={editing ?? null}
      />

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Deadline tracker
        </h2>
        {openApplications.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            No open applications with deadlines yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {openApplications.map((application) => {
              const days = daysUntil(application.deadline, today);
              const isOverdue = days !== null && days < 0;
              const isSoon = days !== null && days >= 0 && days <= 7;

              return (
                <li
                  key={application.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-zinc-950 dark:text-zinc-50">
                      {application.university_name}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {application.deadline || "No deadline"}
                    </p>
                  </div>
                  <p
                    className={
                      isOverdue
                        ? "font-medium text-red-600 dark:text-red-400"
                        : isSoon
                          ? "font-medium text-amber-700 dark:text-amber-400"
                          : "text-zinc-600 dark:text-zinc-400"
                    }
                  >
                    {deadlineLabel(days)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">Your university applications</caption>
          <thead className="border-b border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">University</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-zinc-600 dark:text-zinc-400"
                  colSpan={4}
                >
                  No applications yet. Add one above.
                </td>
              </tr>
            ) : (
              applications.map((application) => (
                <tr
                  key={application.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-950 dark:text-zinc-50">
                      {application.university_name}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {application.university_country}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {application.deadline || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <form
                      action={updateApplicationStatus.bind(null, null)}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="id" value={application.id} />
                      <select
                        name="status"
                        defaultValue={application.status}
                        className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      >
                        {APPLICATION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        Update
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/applications?edit=${application.id}`}
                        className="text-xs font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
                      >
                        Edit
                      </Link>
                      <form action={deleteApplication}>
                        <input type="hidden" name="id" value={application.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
