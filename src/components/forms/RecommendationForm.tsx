"use client";

import { useActionState } from "react";
import { requestRecommendation } from "@/app/(dashboard)/recommendations/actions";
import { RECOMMENDATION_STATUSES } from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

function labelStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function RecommendationForm() {
  const [state, formAction, isPending] = useActionState(
    requestRecommendation,
    null,
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Request a recommendation
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Add a recommender and track the letter from request through submission.
      </p>

      <form className="mt-6 space-y-4" action={formAction} noValidate>
        <div>
          <label
            htmlFor="recommender_name"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Recommender name
          </label>
          <input
            id="recommender_name"
            name="recommender_name"
            type="text"
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.recommender_name)}
            aria-describedby={
              state?.fieldErrors?.recommender_name
                ? "recommender-name-error"
                : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.recommender_name ? (
            <p
              id="recommender-name-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.recommender_name}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="recommender_email"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Recommender email
          </label>
          <input
            id="recommender_email"
            name="recommender_email"
            type="email"
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.recommender_email)}
            aria-describedby={
              state?.fieldErrors?.recommender_email
                ? "recommender-email-error"
                : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.recommender_email ? (
            <p
              id="recommender-email-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.recommender_email}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="recommender_title"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Title
          </label>
          <input
            id="recommender_title"
            name="recommender_title"
            type="text"
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.recommender_title)}
            aria-describedby={
              state?.fieldErrors?.recommender_title
                ? "recommender-title-error"
                : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.recommender_title ? (
            <p
              id="recommender-title-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.recommender_title}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="relationship"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Relationship
          </label>
          <input
            id="relationship"
            name="relationship"
            type="text"
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.relationship)}
            aria-describedby={
              state?.fieldErrors?.relationship
                ? "relationship-error"
                : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.relationship ? (
            <p
              id="relationship-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.relationship}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
              defaultValue="requested"
              disabled={isPending}
              aria-invalid={Boolean(state?.fieldErrors?.status)}
              aria-describedby={
                state?.fieldErrors?.status ? "status-error" : undefined
              }
              className={inputClassName}
            >
              {RECOMMENDATION_STATUSES.map((status) => (
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
              htmlFor="deadline"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Deadline
            </label>
            <input
              id="deadline"
              name="deadline"
              type="date"
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
        </div>

        {state?.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}

        {state?.success ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status">
            Recommendation request saved.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Saving..." : "Save request"}
        </button>
      </form>
    </section>
  );
}
