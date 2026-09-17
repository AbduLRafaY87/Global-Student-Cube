"use client";

import { useActionState } from "react";
import { addVisaRequirement } from "@/app/(dashboard)/visa/actions";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

const textareaClassName = `${inputClassName} min-h-24 resize-y`;

interface VisaRequirementFormProps {
  defaultCountry?: string;
}

export function VisaRequirementForm({
  defaultCountry = "",
}: VisaRequirementFormProps) {
  const [state, formAction, isPending] = useActionState(
    addVisaRequirement,
    null,
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Add a document requirement
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Add custom visa or immigration documents for each destination country.
      </p>

      <form className="mt-6 space-y-4" action={formAction} noValidate>
        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Country
          </label>
          <input
            id="country"
            name="country"
            type="text"
            defaultValue={defaultCountry}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.country)}
            aria-describedby={
              state?.fieldErrors?.country ? "country-error" : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.country ? (
            <p
              id="country-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.country}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="document_name"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Document or requirement
          </label>
          <input
            id="document_name"
            name="document_name"
            type="text"
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.document_name)}
            aria-describedby={
              state?.fieldErrors?.document_name
                ? "document-name-error"
                : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.document_name ? (
            <p
              id="document-name-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.document_name}
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
            rows={3}
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
            Requirement added.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Adding..." : "Add requirement"}
        </button>
      </form>
    </section>
  );
}
