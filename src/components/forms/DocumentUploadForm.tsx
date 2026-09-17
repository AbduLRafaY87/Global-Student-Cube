"use client";

import { useActionState } from "react";
import { uploadDocument } from "@/app/(dashboard)/documents/actions";
import { DOCUMENT_TYPES } from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

function documentTypeLabel(type: string) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function DocumentUploadForm() {
  const [state, formAction, isPending] = useActionState(uploadDocument, null);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Upload document
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Store transcripts, passports, essays, and recommendation letters in your
        vault.
      </p>

      <form className="mt-6 space-y-4" action={formAction} noValidate>
        <div>
          <label
            htmlFor="file"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.file)}
            aria-describedby={state?.fieldErrors?.file ? "file-error" : undefined}
            className={inputClassName}
          />
          {state?.fieldErrors?.file ? (
            <p
              id="file-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.file}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="document_type"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Document type
          </label>
          <select
            id="document_type"
            name="document_type"
            defaultValue=""
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.document_type)}
            aria-describedby={
              state?.fieldErrors?.document_type
                ? "document-type-error"
                : undefined
            }
            className={inputClassName}
          >
            <option value="">Select a type</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {documentTypeLabel(type)}
              </option>
            ))}
          </select>
          {state?.fieldErrors?.document_type ? (
            <p
              id="document-type-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.document_type}
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
            Document uploaded.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Uploading..." : "Upload"}
        </button>
      </form>
    </section>
  );
}
