"use client";

import { useActionState } from "react";
import {
  logTestScore,
  updateTestScore,
} from "@/app/(dashboard)/test-prep/actions";
import { TEST_TYPES, type TestScoreLog } from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

interface TestScoreFormProps {
  score?: TestScoreLog | null;
}

export function TestScoreForm({ score }: TestScoreFormProps) {
  const isEditing = Boolean(score);
  const [state, formAction, isPending] = useActionState(
    isEditing ? updateTestScore : logTestScore,
    null,
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {isEditing ? "Edit score" : "Log a score"}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Record practice or official results for SAT, ACT, TOEFL, IELTS, GRE, and
        GMAT.
      </p>

      <form className="mt-6 space-y-4" action={formAction} noValidate>
        {score ? <input type="hidden" name="id" value={score.id} /> : null}

        <div>
          <label
            htmlFor="test_type"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Test type
          </label>
          <select
            id="test_type"
            name="test_type"
            defaultValue={score?.test_type ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.test_type)}
            aria-describedby={
              state?.fieldErrors?.test_type ? "test-type-error" : undefined
            }
            className={inputClassName}
          >
            <option value="">Select a test</option>
            {TEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {state?.fieldErrors?.test_type ? (
            <p
              id="test-type-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.test_type}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="score"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Score
          </label>
          <input
            id="score"
            name="score"
            type="number"
            inputMode="decimal"
            step="0.01"
            defaultValue={score?.score ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.score)}
            aria-describedby={state?.fieldErrors?.score ? "score-error" : undefined}
            className={inputClassName}
          />
          {state?.fieldErrors?.score ? (
            <p
              id="score-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.score}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="test_date"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Test date
          </label>
          <input
            id="test_date"
            name="test_date"
            type="date"
            defaultValue={score?.test_date ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.test_date)}
            aria-describedby={
              state?.fieldErrors?.test_date ? "test-date-error" : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.test_date ? (
            <p
              id="test-date-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.test_date}
            </p>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            name="is_official"
            defaultChecked={score?.is_official ?? false}
            disabled={isPending}
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
          />
          Official score
        </label>

        {state?.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}

        {state?.success ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status">
            Score saved.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Saving..." : isEditing ? "Save score" : "Log score"}
        </button>
      </form>
    </section>
  );
}
