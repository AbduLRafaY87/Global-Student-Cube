"use client";

import { useActionState } from "react";
import { addTask } from "@/app/(dashboard)/tasks/actions";
import { TASK_PRIORITIES } from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

function labelPriority(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function TaskForm() {
  const [state, formAction, isPending] = useActionState(addTask, null);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Add a task
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Track deadlines and keep your application checklist moving.
      </p>

      <form className="mt-6 space-y-4" action={formAction} noValidate>
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.title)}
            aria-describedby={state?.fieldErrors?.title ? "title-error" : undefined}
            className={inputClassName}
          />
          {state?.fieldErrors?.title ? (
            <p
              id="title-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.title}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="due_date"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Due date
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.due_date)}
            aria-describedby={
              state?.fieldErrors?.due_date ? "due-date-error" : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.due_date ? (
            <p
              id="due-date-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.due_date}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue="medium"
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.priority)}
            aria-describedby={
              state?.fieldErrors?.priority ? "priority-error" : undefined
            }
            className={inputClassName}
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {labelPriority(priority)}
              </option>
            ))}
          </select>
          {state?.fieldErrors?.priority ? (
            <p
              id="priority-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.priority}
            </p>
          ) : null}
        </div>

        {state?.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}

        {state?.success ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status">
            Task added.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Adding..." : "Add task"}
        </button>
      </form>
    </section>
  );
}
