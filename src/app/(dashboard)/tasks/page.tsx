import {
  deleteTask,
  toggleTaskCompletion,
} from "@/app/(dashboard)/tasks/actions";
import { TaskForm } from "@/components/forms/TaskForm";
import { createClient } from "@/lib/supabase/server";
import {
  TASK_PRIORITIES,
  type TaskItem,
  type TaskPriority,
} from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks",
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
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

function labelPriority(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function priorityClass(priority: TaskPriority): string {
  if (priority === "high") {
    return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  }

  if (priority === "medium") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  }

  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const priorityFilter = parseTaskPriority(firstParam(params.priority));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tasks: TaskItem[] = [];

  if (user) {
    let query = supabase
      .from("tasks")
      .select(
        "id, student_id, title, due_date, is_completed, priority, created_at",
      )
      .eq("student_id", user.id)
      .order("is_completed", { ascending: true })
      .order("due_date", { ascending: true });

    if (priorityFilter) {
      query = query.eq("priority", priorityFilter);
    }

    const { data } = await query;

    if (data) {
      for (const row of data) {
        const task = toTaskItem(row);
        if (task) {
          tasks.push(task);
        }
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const openCount = tasks.filter((task) => !task.is_completed).length;
  const completedCount = tasks.filter((task) => task.is_completed).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Task checklist
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Add tasks, mark them complete, and filter the list by priority.
        </p>
      </header>

      <TaskForm />

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Filter by priority
        </h2>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Priority filters">
          <Link
            href="/tasks"
            className={
              priorityFilter
                ? "rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                : "rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            }
          >
            All
          </Link>
          {TASK_PRIORITIES.map((priority) => {
            const isActive = priorityFilter === priority;

            return (
              <Link
                key={priority}
                href={`/tasks?priority=${priority}`}
                className={
                  isActive
                    ? "rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }
              >
                {labelPriority(priority)}
              </Link>
            );
          })}
        </nav>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Open
            </dt>
            <dd className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
              {openCount}
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Completed
            </dt>
            <dd className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
              {completedCount}
            </dd>
          </div>
        </dl>
      </section>

      {tasks.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {priorityFilter
            ? "No tasks match this priority."
            : "No tasks yet. Add one above."}
        </p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const isOverdue =
              !task.is_completed && task.due_date !== "" && task.due_date < today;

            return (
              <li
                key={task.id}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <form action={toggleTaskCompletion}>
                    <input type="hidden" name="id" value={task.id} />
                    <button
                      type="submit"
                      aria-pressed={task.is_completed}
                      aria-label={
                        task.is_completed
                          ? `Mark ${task.title} incomplete`
                          : `Mark ${task.title} complete`
                      }
                      className={
                        task.is_completed
                          ? "mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-zinc-900 bg-zinc-900 text-xs text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "mt-0.5 h-5 w-5 rounded border border-zinc-400 bg-white dark:border-zinc-600 dark:bg-zinc-950"
                      }
                    >
                      {task.is_completed ? "✓" : null}
                    </button>
                  </form>
                  <div className="min-w-0">
                    <p
                      className={
                        task.is_completed
                          ? "font-medium text-zinc-500 line-through"
                          : "font-medium text-zinc-950 dark:text-zinc-50"
                      }
                    >
                      {task.title}
                    </p>
                    <p
                      className={
                        isOverdue
                          ? "mt-1 text-sm font-medium text-red-600 dark:text-red-400"
                          : "mt-1 text-sm text-zinc-600 dark:text-zinc-400"
                      }
                    >
                      Due {task.due_date || "—"}
                      {isOverdue ? " · Overdue" : null}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium tracking-wide uppercase ${priorityClass(task.priority)}`}
                  >
                    {task.priority}
                  </span>
                  <form action={deleteTask}>
                    <input type="hidden" name="id" value={task.id} />
                    <button
                      type="submit"
                      className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
