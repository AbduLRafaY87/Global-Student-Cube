import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type TaskItem,
  type TaskPriority,
} from "@/types";

export interface ParentApplicationSummary {
  id: string;
  universityName: string;
  status: ApplicationStatus;
  deadline: string;
}

export interface ParentProgressCardProps {
  studentName: string;
  applications: ParentApplicationSummary[];
  tasks: TaskItem[];
  today: string;
}

function labelStatus(status: ApplicationStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
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

function priorityClass(priority: TaskPriority): string {
  if (priority === "high") {
    return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  }

  if (priority === "medium") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  }

  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
}

export function ParentProgressCard({
  studentName,
  applications,
  tasks,
  today,
}: ParentProgressCardProps) {
  const statusCounts = APPLICATION_STATUSES.map((status) => ({
    status,
    count: applications.filter((application) => application.status === status)
      .length,
  }));

  const upcoming = applications
    .filter(
      (application) =>
        application.status === "draft" || application.status === "submitted",
    )
    .slice()
    .sort((left, right) => left.deadline.localeCompare(right.deadline));

  const completedTasks = tasks.filter((task) => task.is_completed).length;
  const openTasks = tasks.filter((task) => !task.is_completed);

  return (
    <article className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <header>
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Linked student
        </p>
        <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          {studentName}
        </h2>
      </header>

      <section>
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Application statuses
        </h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statusCounts.map((entry) => (
            <li
              key={entry.status}
              className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                {labelStatus(entry.status)}
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {entry.count}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Upcoming deadlines
        </h3>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            No open application deadlines.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {upcoming.map((application) => {
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
                      {application.universityName}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {labelStatus(application.status)}
                      {application.deadline ? ` · ${application.deadline}` : ""}
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

      <section>
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Task completions
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {completedTasks} of {tasks.length} complete
        </p>
        {openTasks.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {tasks.length === 0
              ? "No tasks on this checklist yet."
              : "All tasks are complete."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {openTasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div>
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">
                    {task.title}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Due {task.due_date || "—"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium tracking-wide uppercase ${priorityClass(task.priority)}`}
                >
                  {task.priority}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
