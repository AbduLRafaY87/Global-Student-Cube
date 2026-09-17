import {
  ParentProgressCard,
  type ParentApplicationSummary,
} from "@/components/ParentProgressCard";
import { createClient } from "@/lib/supabase/server";
import {
  APPLICATION_STATUSES,
  TASK_PRIORITIES,
  type ApplicationStatus,
  type ParentStudentLink,
  type TaskItem,
  type TaskPriority,
} from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parent portal",
};

interface StudentOverview {
  id: string;
  name: string;
  applications: ParentApplicationSummary[];
  tasks: TaskItem[];
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

function parseTaskPriority(value: unknown): TaskPriority | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const priority of TASK_PRIORITIES) {
    if (priority === value) {
      return priority;
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

function toParentStudentLink(row: {
  id: unknown;
  parent_id: unknown;
  student_id: unknown;
  created_at: unknown;
}): ParentStudentLink | null {
  if (
    typeof row.id !== "string" ||
    typeof row.parent_id !== "string" ||
    typeof row.student_id !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    parent_id: row.parent_id,
    student_id: row.student_id,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

function studentName(row: {
  id: unknown;
  first_name: unknown;
  last_name: unknown;
}): { id: string; name: string } | null {
  if (
    typeof row.id !== "string" ||
    typeof row.first_name !== "string" ||
    typeof row.last_name !== "string"
  ) {
    return null;
  }

  const name = `${row.first_name} ${row.last_name}`.trim();

  return {
    id: row.id,
    name: name === "" ? "Linked student" : name,
  };
}

function toApplicationSummary(row: {
  id: unknown;
  student_id: unknown;
  status: unknown;
  deadline: unknown;
  universities: unknown;
}): (ParentApplicationSummary & { student_id: string }) | null {
  const status = parseApplicationStatus(row.status);

  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    !status
  ) {
    return null;
  }

  let universityName = "Unknown university";
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
    universityName,
    status,
    deadline: toDateOnly(row.deadline),
  };
}

function toTaskItem(row: {
  id: unknown;
  student_id: unknown;
  title: unknown;
  due_date: unknown;
  is_completed: unknown;
  priority: unknown;
  created_at: unknown;
}): TaskItem | null {
  const priority = parseTaskPriority(row.priority);

  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    typeof row.title !== "string" ||
    !priority
  ) {
    return null;
  }

  return {
    id: row.id,
    student_id: row.student_id,
    title: row.title,
    due_date: toDateOnly(row.due_date),
    is_completed: row.is_completed === true,
    priority,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export default async function ParentPortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const overviews: StudentOverview[] = [];

  if (user) {
    const { data: linkRows } = await supabase
      .from("parent_student_links")
      .select("id, parent_id, student_id, created_at")
      .eq("parent_id", user.id)
      .order("created_at", { ascending: true });

    const links: ParentStudentLink[] = [];
    if (linkRows) {
      for (const row of linkRows) {
        const link = toParentStudentLink(row);
        if (link) {
          links.push(link);
        }
      }
    }

    const studentIds = [...new Set(links.map((link) => link.student_id))];

    if (studentIds.length > 0) {
      const names = new Map<string, string>();
      const applicationsByStudent = new Map<string, ParentApplicationSummary[]>();
      const tasksByStudent = new Map<string, TaskItem[]>();

      const [{ data: profileRows }, { data: applicationRows }, { data: taskRows }] =
        await Promise.all([
          supabase
            .from("user_profiles")
            .select("id, first_name, last_name")
            .in("id", studentIds),
          supabase
            .from("applications")
            .select("id, student_id, status, deadline, universities(name)")
            .in("student_id", studentIds)
            .order("deadline", { ascending: true }),
          supabase
            .from("tasks")
            .select(
              "id, student_id, title, due_date, is_completed, priority, created_at",
            )
            .in("student_id", studentIds)
            .order("is_completed", { ascending: true })
            .order("due_date", { ascending: true }),
        ]);

      if (profileRows) {
        for (const row of profileRows) {
          const profile = studentName(row);
          if (profile) {
            names.set(profile.id, profile.name);
          }
        }
      }

      if (applicationRows) {
        for (const row of applicationRows) {
          const application = toApplicationSummary(row);
          if (!application) {
            continue;
          }

          const current = applicationsByStudent.get(application.student_id) ?? [];
          current.push({
            id: application.id,
            universityName: application.universityName,
            status: application.status,
            deadline: application.deadline,
          });
          applicationsByStudent.set(application.student_id, current);
        }
      }

      if (taskRows) {
        for (const row of taskRows) {
          const task = toTaskItem(row);
          if (!task) {
            continue;
          }

          const current = tasksByStudent.get(task.student_id) ?? [];
          current.push(task);
          tasksByStudent.set(task.student_id, current);
        }
      }

      for (const studentId of studentIds) {
        overviews.push({
          id: studentId,
          name: names.get(studentId) ?? "Linked student",
          applications: applicationsByStudent.get(studentId) ?? [],
          tasks: tasksByStudent.get(studentId) ?? [],
        });
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Parent portal
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Read-only progress for linked students: application statuses,
          upcoming deadlines, and checklist completion.
        </p>
      </header>

      {overviews.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No linked students yet. A student or admin must create the link
          before progress can appear here.
        </p>
      ) : (
        <ul className="flex flex-col gap-6">
          {overviews.map((overview) => (
            <li key={overview.id}>
              <ParentProgressCard
                studentName={overview.name}
                applications={overview.applications}
                tasks={overview.tasks}
                today={today}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
