"use client";

import { useActionState } from "react";
import {
  logInterview,
  updateInterview,
} from "@/app/(dashboard)/interviews/actions";
import {
  INTERVIEW_STATUSES,
  type InterviewSession,
  type University,
} from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

const textareaClassName = `${inputClassName} min-h-32 resize-y`;

interface InterviewFormProps {
  universities: Pick<University, "id" | "name" | "country">[];
  interview?: InterviewSession | null;
}

function toDateTimeLocal(value: string): string {
  if (value.length >= 16) {
    return value.slice(0, 16);
  }

  return value;
}

function labelStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function InterviewForm({ universities, interview }: InterviewFormProps) {
  const isEditing = Boolean(interview);
  const [state, formAction, isPending] = useActionState(
    isEditing ? updateInterview : logInterview,
    null,
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {isEditing ? "Edit interview" : "Log an interview"}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Save the date, interviewer, and prep notes for each session.
      </p>

      <form className="mt-6 space-y-4" action={formAction} noValidate>
        {interview ? <input type="hidden" name="id" value={interview.id} /> : null}

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
            defaultValue={interview?.university_id ?? ""}
            disabled={isPending}
            className={inputClassName}
          >
            <option value="">No university</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
                {university.country ? ` · ${university.country}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="scheduled_at"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Date and time
          </label>
          <input
            id="scheduled_at"
            name="scheduled_at"
            type="datetime-local"
            defaultValue={
              interview ? toDateTimeLocal(interview.scheduled_at) : ""
            }
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.scheduled_at)}
            aria-describedby={
              state?.fieldErrors?.scheduled_at ? "scheduled-at-error" : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.scheduled_at ? (
            <p
              id="scheduled-at-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.scheduled_at}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="interviewer_name"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Interviewer
          </label>
          <input
            id="interviewer_name"
            name="interviewer_name"
            type="text"
            defaultValue={interview?.interviewer_name ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.interviewer_name)}
            aria-describedby={
              state?.fieldErrors?.interviewer_name
                ? "interviewer-name-error"
                : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.interviewer_name ? (
            <p
              id="interviewer-name-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.interviewer_name}
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
            defaultValue={interview?.status ?? "scheduled"}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.status)}
            aria-describedby={
              state?.fieldErrors?.status ? "status-error" : undefined
            }
            className={inputClassName}
          >
            {INTERVIEW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {labelStatus(status)}
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

        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={5}
            defaultValue={interview?.notes ?? ""}
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
            Interview saved.
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
              ? "Save interview"
              : "Log interview"}
        </button>
      </form>
    </section>
  );
}
