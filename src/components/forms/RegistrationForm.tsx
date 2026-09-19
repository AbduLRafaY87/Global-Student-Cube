"use client";

import { useActionState } from "react";
import { completeOnboarding } from "@/app/(dashboard)/onboarding/actions";
import type { UserProfile } from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

interface RegistrationFormProps {
  profile?: Pick<UserProfile, "first_name" | "last_name" | "phone"> | null;
}

export function RegistrationForm({ profile }: RegistrationFormProps) {
  const [state, formAction, isPending] = useActionState(
    completeOnboarding,
    null,
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
        Global Student Cube
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Complete your profile
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Tell us who you are so we can finish setting up your account.
      </p>

      <form className="mt-8 space-y-4" action={formAction} noValidate>
        <div>
          <label
            htmlFor="first_name"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            First name
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            autoComplete="given-name"
            defaultValue={profile?.first_name ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.first_name)}
            aria-describedby={
              state?.fieldErrors?.first_name ? "first-name-error" : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.first_name ? (
            <p
              id="first-name-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.first_name}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="last_name"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Last name
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            autoComplete="family-name"
            defaultValue={profile?.last_name ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.last_name)}
            aria-describedby={
              state?.fieldErrors?.last_name ? "last-name-error" : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.last_name ? (
            <p
              id="last-name-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.last_name}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={profile?.phone ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.phone)}
            aria-describedby={
              state?.fieldErrors?.phone ? "phone-error" : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.phone ? (
            <p
              id="phone-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.phone}
            </p>
          ) : null}
        </div>

        {state?.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Saving..." : "Complete onboarding"}
        </button>
      </form>
    </section>
  );
}
