"use client";

import { useActionState } from "react";
import { upsertStudentProfile } from "@/app/(dashboard)/profile/actions";
import type { StudentProfile } from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

interface StudentProfileFormProps {
  profile?: Pick<
    StudentProfile,
    | "target_major"
    | "target_country"
    | "graduation_year"
    | "gpa"
    | "test_scores"
  > | null;
}

function scoreValue(scores: Record<string, unknown> | undefined, key: string) {
  const value = scores?.[key];
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return "";
}

export function StudentProfileForm({ profile }: StudentProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    upsertStudentProfile,
    null,
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
        Global Student Cube
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Student profile
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Save your academic targets and test scores so we can match universities.
      </p>

      <form className="mt-8 space-y-4" action={formAction} noValidate>
        <div>
          <label
            htmlFor="target_major"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Target major
          </label>
          <input
            id="target_major"
            name="target_major"
            type="text"
            defaultValue={profile?.target_major ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.target_major)}
            aria-describedby={
              state?.fieldErrors?.target_major ? "target-major-error" : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.target_major ? (
            <p
              id="target-major-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.target_major}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="target_country"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Target country
          </label>
          <input
            id="target_country"
            name="target_country"
            type="text"
            defaultValue={profile?.target_country ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.target_country)}
            aria-describedby={
              state?.fieldErrors?.target_country
                ? "target-country-error"
                : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.target_country ? (
            <p
              id="target-country-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.target_country}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="graduation_year"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Graduation year
          </label>
          <input
            id="graduation_year"
            name="graduation_year"
            type="number"
            inputMode="numeric"
            defaultValue={profile?.graduation_year ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.graduation_year)}
            aria-describedby={
              state?.fieldErrors?.graduation_year
                ? "graduation-year-error"
                : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.graduation_year ? (
            <p
              id="graduation-year-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.graduation_year}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="gpa"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            GPA
          </label>
          <input
            id="gpa"
            name="gpa"
            type="number"
            inputMode="decimal"
            step="0.01"
            defaultValue={profile?.gpa ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.gpa)}
            aria-describedby={state?.fieldErrors?.gpa ? "gpa-error" : undefined}
            className={inputClassName}
          />
          {state?.fieldErrors?.gpa ? (
            <p
              id="gpa-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.gpa}
            </p>
          ) : null}
        </div>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Standardized test scores
          </legend>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Optional. Leave blank if you have not taken a test.
          </p>

          <div>
            <label
              htmlFor="sat"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              SAT
            </label>
            <input
              id="sat"
              name="sat"
              type="number"
              inputMode="numeric"
              defaultValue={scoreValue(profile?.test_scores, "sat")}
              disabled={isPending}
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="act"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              ACT
            </label>
            <input
              id="act"
              name="act"
              type="number"
              inputMode="decimal"
              step="0.1"
              defaultValue={scoreValue(profile?.test_scores, "act")}
              disabled={isPending}
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="toefl"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              TOEFL
            </label>
            <input
              id="toefl"
              name="toefl"
              type="number"
              inputMode="numeric"
              defaultValue={scoreValue(profile?.test_scores, "toefl")}
              disabled={isPending}
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="ielts"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              IELTS
            </label>
            <input
              id="ielts"
              name="ielts"
              type="number"
              inputMode="decimal"
              step="0.5"
              defaultValue={scoreValue(profile?.test_scores, "ielts")}
              disabled={isPending}
              className={inputClassName}
            />
          </div>
        </fieldset>

        {state?.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}

        {state?.success ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status">
            Student profile saved.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Saving..." : "Save profile"}
        </button>
      </form>
    </section>
  );
}
