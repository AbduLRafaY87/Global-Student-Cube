import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import {
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  LEARNING_AUDIENCES,
  LEARNING_CATEGORIES,
  isLearningAudience,
  isLearningCategory,
} from "@/domain/learning/learning";
import { loadLearningHome } from "@/server/modules/learning/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Learning" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export default async function LearningHomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; audience?: string; q?: string }>;
}) {
  const filters = await searchParams;
  const category = filters.category && isLearningCategory(filters.category) ? filters.category : "";
  const audience = filters.audience && isLearningAudience(filters.audience) ? filters.audience : "";
  const search = filters.q?.trim() ?? "";
  const loaded = await loadLearningHome(category, audience, search);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const continueRow =
    loaded.data.continue && typeof loaded.data.continue === "object"
      ? (loaded.data.continue as Record<string, unknown>)
      : null;
  const courses = Array.isArray(loaded.data.courses) ? loaded.data.courses : [];
  const recent = Array.isArray(loaded.data.recent) ? loaded.data.recent : [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Learning</h1>
        <p className="mt-2 text-sm text-text-muted">
          Completion is not an accredited award. Parent guidance stays independently discoverable.
        </p>
      </header>
      {continueRow?.courseId ? (
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">Continue learning</h2>
          <p className="mt-2 text-sm text-text">{asString(continueRow.title)}</p>
          <Link
            className="mt-3 inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
            href={
              continueRow.lessonId
                ? `/learning/courses/${asString(continueRow.courseId)}/lessons/${asString(continueRow.lessonId)}`
                : `/learning/courses/${asString(continueRow.courseId)}`
            }
          >
            Continue learning
          </Link>
        </section>
      ) : (
        <EmptyState
          title="Start with a role tutorial"
          message="No progress yet. Open the introductory walk-through for your role."
        />
      )}
      <form className="grid gap-3 min-[600px]:grid-cols-3" method="get" action="/learning">
        <label className="text-sm text-text">
          Category
          <select
            name="category"
            defaultValue={category}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">All categories</option>
            {LEARNING_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-text">
          Audience
          <select
            name="audience"
            defaultValue={audience}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">All audiences</option>
            {LEARNING_AUDIENCES.map((item) => (
              <option key={item} value={item}>
                {AUDIENCE_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-text">
          Search
          <input
            name="q"
            defaultValue={search}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <button
          type="submit"
          className="h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-4 text-sm font-medium min-[600px]:col-span-3"
        >
          Apply filters
        </button>
      </form>
      <nav>
        <Link className="text-primary underline-offset-2 hover:underline" href="/learning/library">
          Resource library
        </Link>
      </nav>
      {courses.length === 0 ? (
        <EmptyState title="No published courses" message="Nothing matches these filters." />
      ) : (
        <ul className="grid gap-3 min-[600px]:grid-cols-2">
          {courses.map((row) => {
            const item = row as Record<string, unknown>;
            return (
              <li key={asString(item.id)} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <h2 className="text-lg font-semibold text-text">{asString(item.title)}</h2>
                <p className="mt-2 text-sm text-text-muted">
                  {asString(item.author)} · {asCount(item.lessonCount)} lessons ·{" "}
                  {asCount(item.durationMinutes)} minutes
                </p>
                <p className="mt-2 text-sm text-text">{asString(item.summary)}</p>
                <p className="mt-2 text-sm text-text-muted">
                  Progress {asString(item.progressState)} · {asCount(item.completedCount)} complete
                </p>
                <Link
                  className="mt-3 inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
                  href={`/learning/courses/${asString(item.id)}`}
                >
                  View course
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {recent.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-text">Recently added</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {recent.map((row) => {
              const item = row as Record<string, unknown>;
              const href =
                item.kind === "resource"
                  ? `/learning/library/${asString(item.id)}`
                  : `/learning/courses/${asString(item.id)}`;
              return (
                <li key={asString(item.id)}>
                  <Link className="text-primary underline-offset-2 hover:underline" href={href}>
                    {asString(item.title)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
