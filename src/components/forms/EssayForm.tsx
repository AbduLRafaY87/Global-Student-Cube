"use client";

import { useActionState, useState } from "react";
import {
  createEssay,
  updateEssay,
} from "@/app/(dashboard)/essays/actions";
import {
  ESSAY_STATUSES,
  type Essay,
  type University,
} from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

const textareaClassName = `${inputClassName} min-h-48 resize-y`;

interface EssayFormProps {
  universities: Pick<University, "id" | "name" | "country">[];
  essay?: Essay | null;
}

function countWords(content: string): number {
  const trimmed = content.trim();
  if (trimmed === "") {
    return 0;
  }

  return trimmed.split(/\s+/).filter((word) => word.length > 0).length;
}

export function EssayForm({ universities, essay }: EssayFormProps) {
  const isEditing = Boolean(essay);
  const [content, setContent] = useState(essay?.content ?? "");
  const [wordLimit, setWordLimit] = useState(essay?.word_limit ?? 650);
  const [state, formAction, isPending] = useActionState(
    isEditing ? updateEssay : createEssay,
    null,
  );
  const wordCount = countWords(content);
  const isOverLimit = wordCount > wordLimit;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {isEditing ? "Edit essay" : "New essay"}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Draft against the prompt and watch the live word count.
      </p>

      <form className="mt-6 space-y-4" action={formAction} noValidate>
        {essay ? <input type="hidden" name="id" value={essay.id} /> : null}

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
            defaultValue={essay?.title ?? ""}
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
            htmlFor="university_id"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            University
          </label>
          <select
            id="university_id"
            name="university_id"
            defaultValue={essay?.university_id ?? ""}
            disabled={isPending}
            className={inputClassName}
          >
            <option value="">No university (general essay)</option>
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
            htmlFor="status"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={essay?.status ?? "brainstorming"}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.status)}
            aria-describedby={
              state?.fieldErrors?.status ? "status-error" : undefined
            }
            className={inputClassName}
          >
            {ESSAY_STATUSES.map((status) => (
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

        <div>
          <label
            htmlFor="word_limit"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Word limit
          </label>
          <input
            id="word_limit"
            name="word_limit"
            type="number"
            min="1"
            step="1"
            value={wordLimit}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.word_limit)}
            aria-describedby={
              state?.fieldErrors?.word_limit ? "word-limit-error" : undefined
            }
            className={inputClassName}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              setWordLimit(Number.isFinite(parsed) ? parsed : 0);
            }}
          />
          {state?.fieldErrors?.word_limit ? (
            <p
              id="word-limit-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.word_limit}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="prompt"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Prompt
          </label>
          <textarea
            id="prompt"
            name="prompt"
            rows={3}
            defaultValue={essay?.prompt ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.prompt)}
            aria-describedby={
              state?.fieldErrors?.prompt ? "prompt-error" : undefined
            }
            className={textareaClassName}
          />
          {state?.fieldErrors?.prompt ? (
            <p
              id="prompt-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.prompt}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-end justify-between gap-4">
            <label
              htmlFor="content"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Essay
            </label>
            <p
              className={
                isOverLimit
                  ? "text-sm font-medium text-red-600 dark:text-red-400"
                  : "text-sm text-zinc-600 dark:text-zinc-400"
              }
              aria-live="polite"
            >
              {wordCount} / {wordLimit} words
            </p>
          </div>
          <textarea
            id="content"
            name="content"
            rows={12}
            value={content}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.content) || isOverLimit}
            aria-describedby="word-count"
            className={textareaClassName}
            onChange={(event) => setContent(event.target.value)}
          />
          <p
            id="word-count"
            className={
              isOverLimit
                ? "mt-1 text-sm text-red-600 dark:text-red-400"
                : "mt-1 text-sm text-zinc-500 dark:text-zinc-400"
            }
          >
            {isOverLimit
              ? `Over the limit by ${wordCount - wordLimit} word${
                  wordCount - wordLimit === 1 ? "" : "s"
                }.`
              : `${Math.max(wordLimit - wordCount, 0)} word${
                  Math.max(wordLimit - wordCount, 0) === 1 ? "" : "s"
                } remaining.`}
          </p>
        </div>

        {state?.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}

        {state?.success ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status">
            Essay saved.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Saving..." : isEditing ? "Save essay" : "Create essay"}
        </button>
      </form>
    </section>
  );
}
