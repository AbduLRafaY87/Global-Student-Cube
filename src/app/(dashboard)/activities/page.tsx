import { deleteActivity } from "@/app/(dashboard)/activities/actions";
import { ActivityForm } from "@/components/forms/ActivityForm";
import { createClient } from "@/lib/supabase/server";
import type { StudentActivity } from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activities",
};

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

function toStudentActivity(row: {
  id: unknown;
  student_id: unknown;
  title: unknown;
  organization: unknown;
  role: unknown;
  description: unknown;
  hours_per_week: unknown;
  weeks_per_year: unknown;
  created_at: unknown;
}): StudentActivity | null {
  const hoursPerWeek = toNumber(row.hours_per_week);
  const weeksPerYear = toNumber(row.weeks_per_year);

  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    typeof row.title !== "string" ||
    typeof row.organization !== "string" ||
    typeof row.role !== "string" ||
    hoursPerWeek === null ||
    weeksPerYear === null
  ) {
    return null;
  }

  return {
    id: row.id,
    student_id: row.student_id,
    title: row.title,
    organization: row.organization,
    role: row.role,
    description: typeof row.description === "string" ? row.description : "",
    hours_per_week: hoursPerWeek,
    weeks_per_year: weeksPerYear,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default async function ActivitiesPage({
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

  const activities: StudentActivity[] = [];

  if (user) {
    const { data } = await supabase
      .from("activities")
      .select(
        "id, student_id, title, organization, role, description, hours_per_week, weeks_per_year, created_at",
      )
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      for (const row of data) {
        const activity = toStudentActivity(row);
        if (activity) {
          activities.push(activity);
        }
      }
    }
  }

  const editing = activities.find((activity) => activity.id === editId);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Activities portfolio
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Keep extracurriculars in Common App order: activity, organization,
          position, hours per week, weeks per year, and description.
        </p>
      </header>

      <ActivityForm activity={editing ?? null} />

      <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">Common App activity list</caption>
          <thead className="border-b border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Activity</th>
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">Hr/Wk</th>
              <th className="px-4 py-3 font-medium">Wk/Yr</th>
              <th className="px-4 py-3 font-medium">Hours/Yr</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-zinc-600 dark:text-zinc-400"
                  colSpan={8}
                >
                  No activities yet. Add one above.
                </td>
              </tr>
            ) : (
              activities.map((activity) => (
                <tr
                  key={activity.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3 font-medium text-zinc-950 dark:text-zinc-50">
                    {activity.title}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {activity.organization}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {activity.role}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {formatHours(activity.hours_per_week)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {formatHours(activity.weeks_per_year)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {formatHours(
                      activity.hours_per_week * activity.weeks_per_year,
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    <p className="line-clamp-2">
                      {activity.description || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/activities?edit=${activity.id}`}
                        className="text-xs font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
                      >
                        Edit
                      </Link>
                      <form action={deleteActivity}>
                        <input type="hidden" name="id" value={activity.id} />
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
