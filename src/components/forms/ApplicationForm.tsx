"use client";

import { useActionState } from "react";
import {
  createApplication,
  updateApplicationStatus,
} from "@/app/(dashboard)/applications/actions";
import {
  APPLICATION_STATUSES,
  type Application,
  type University,
} from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

interface ApplicationFormProps {
  universities: Pick<University, "id" | "name" | "country">[];
  application?: Application | null;
}

export function ApplicationForm({
  universities,
  application,
}: ApplicationFormProps) {
  const isEditing = Boolean(application);
  const [state, formAction, isPending] = useActionState(
    isEditing ? updateApplicationStatus : createApplication,
    null,
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {isEditing ? "Edit application" : "Add application"}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Track a university deadline and keep the status up to date.
      </p>

      <form className="mt-6 space-y-4" action={formAction} noValidate>
        {application ? (
          <input type="hidden" name="id" value={application.id} />
        ) : null}

        <div>
          <label
            htmlFor="university_id"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            University
          </label>
          <select
            id="university_id"
            name="university_id"
            defaultValue={application?.university_id ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.university_id)}
            aria-describedby={
              state?.fieldErrors?.university_id
                ? "university-id-error"
                : undefined
            }
            className={inputClassName}
          >
            <option value="">Select a university</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
                {university.country ? ` · ${university.country}` : ""}
              </option>
            ))}
          </select>
          {state?.fieldErrors?.university_id ? (
            <p
              id="university-id-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.university_id}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="deadline"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Deadline
          </label>
          <input
            id="deadline"
            name="deadline"
            type="date"
            defaultValue={application?.deadline ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.deadline)}
            aria-describedby={
              state?.fieldErrors?.deadline ? "deadline-error" : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.deadline ? (
            <p
              id="deadline-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.deadline}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={application?.status ?? "draft"}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.status)}
            aria-describedby={
              state?.fieldErrors?.status ? "status-error" : undefined
            }
            className={inputClassName}
          >
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
          {state?.fieldErrors?.status ? (
            <p
              id="status-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.status}
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
            Application saved.
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
              ? "Save changes"
              : "Add application"}
        </button>
      </form>
    </section>
  );
}
