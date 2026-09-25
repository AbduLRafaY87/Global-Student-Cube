import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { LEARNING_CATEGORIES, LIBRARY_TYPES } from "@/domain/learning/learning";
import { loadLearningLibrary } from "@/server/modules/learning/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Resource library" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; type?: string }>;
}) {
  const filters = await searchParams;
  const loaded = await loadLearningLibrary(
    filters.q?.trim() ?? "",
    filters.category ?? "",
    filters.type ?? "",
  );
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const saved = loaded.data.filter((row) => (row as Record<string, unknown>).saved === true);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Resource library</h1>
        <p className="mt-2 text-sm text-text-muted">
          SOP templates, resume samples, timelines and budgeting sheets. Unpublished files stay
          unavailable.
        </p>
      </header>
      <form className="grid gap-3 min-[600px]:grid-cols-3" method="get" action="/learning/library">
        <label className="text-sm text-text">
          Search
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <label className="text-sm text-text">
          Category
          <select
            name="category"
            defaultValue={filters.category ?? ""}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">All</option>
            {LEARNING_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-text">
          File type
          <select
            name="type"
            defaultValue={filters.type ?? ""}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">All</option>
            {LIBRARY_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-12 rounded-[var(--radius-control)] border border-control-border px-4 text-sm min-[600px]:col-span-3"
        >
          Apply filters
        </button>
      </form>
      {saved.length === 0 ? (
        <EmptyState title="Saved library is empty" message="Browse published resources below." />
      ) : null}
      {loaded.data.length === 0 ? (
        <EmptyState title="No resources" message="Nothing matches these filters." />
      ) : (
        <ul className="space-y-3">
          {loaded.data.map((row) => {
            const item = row as Record<string, unknown>;
            return (
              <li key={asString(item.id)} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <Link
                  className="text-primary underline-offset-2 hover:underline"
                  href={`/learning/library/${asString(item.id)}`}
                >
                  {asString(item.title)}
                </Link>
                <p className="mt-1 text-sm text-text-muted">
                  {asString(item.libraryType)} · {asString(item.fileFormat)} · version{" "}
                  {asString(item.version) || String(item.version)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
