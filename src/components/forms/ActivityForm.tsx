"use client";

import { useActionState } from "react";
import {
  addActivity,
  updateActivity,
} from "@/app/(dashboard)/activities/actions";
import type { StudentActivity } from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

const textareaClassName = `${inputClassName} min-h-32 resize-y`;

interface ActivityFormProps {
  activity?: StudentActivity | null;
}

export function ActivityForm({ activity }: ActivityFormProps) {
  const isEditing = Boolean(activity);
  const [state, formAction, isPending] = useActionState(
    isEditing ? updateActivity : addActivity,
    null,
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {isEditing ? "Edit activity" : "Add an activity"}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Record each activity the way the Common App lists it: name,
        organization, position, hours, and description.
      </p>

      <form className="mt-6 space-y-4" action={formAction} noValidate>
        {activity ? <input type="hidden" name="id" value={activity.id} /> : null}

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Activity
          </label>
          <input
            id="title"
            name="title"
            type="text"
            defaultValue={activity?.title ?? ""}
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
            htmlFor="organization"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Organization
          </label>
          <input
            id="organization"
            name="organization"
            type="text"
            defaultValue={activity?.organization ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.organization)}
            aria-describedby={
              state?.fieldErrors?.organization ? "organization-error" : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.organization ? (
            <p
              id="organization-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.organization}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Position / role
          </label>
          <input
            id="role"
            name="role"
            type="text"
            defaultValue={activity?.role ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.role)}
            aria-describedby={state?.fieldErrors?.role ? "role-error" : undefined}
            className={inputClassName}
          />
          {state?.fieldErrors?.role ? (
            <p
              id="role-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.role}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="hours_per_week"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Hours per week
            </label>
            <input
              id="hours_per_week"
              name="hours_per_week"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              defaultValue={activity?.hours_per_week ?? ""}
              disabled={isPending}
              aria-invalid={Boolean(state?.fieldErrors?.hours_per_week)}
              aria-describedby={
                state?.fieldErrors?.hours_per_week
                  ? "hours-per-week-error"
                  : undefined
              }
              className={inputClassName}
            />
            {state?.fieldErrors?.hours_per_week ? (
              <p
                id="hours-per-week-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {state.fieldErrors.hours_per_week}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="weeks_per_year"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Weeks per year
            </label>
            <input
              id="weeks_per_year"
              name="weeks_per_year"
              type="number"
              inputMode="decimal"
              min="0"
              max="52"
              step="1"
              defaultValue={activity?.weeks_per_year ?? ""}
              disabled={isPending}
              aria-invalid={Boolean(state?.fieldErrors?.weeks_per_year)}
              aria-describedby={
                state?.fieldErrors?.weeks_per_year
                  ? "weeks-per-year-error"
                  : undefined
              }
              className={inputClassName}
            />
            {state?.fieldErrors?.weeks_per_year ? (
              <p
                id="weeks-per-year-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {state.fieldErrors.weeks_per_year}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={activity?.description ?? ""}
            disabled={isPending}
            className={textareaClassName}
          />
        </div>

        {state?.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}

        {state?.success ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status">
            Activity saved.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending
            ? "Saving..."
            : isEditing
              ? "Save activity"
              : "Add activity"}
        </button>
      </form>
    </section>
  );
}
