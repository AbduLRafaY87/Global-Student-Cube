import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { CONTENT_KINDS, CONTENT_STATES } from "@/domain/learning/learning";
import { loadAdminContent } from "@/server/modules/learning/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Content editor" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; state?: string }>;
}) {
  const filters = await searchParams;
  const loaded = await loadAdminContent(filters.kind ?? "", filters.state ?? "");

  return (
    <AdminChrome
      title="Learning and recognition content"
      description="Draft, review, then publish. Counselor submissions never self-publish. Video needs captions or a transcript."
    >
      <form className="grid gap-3 min-[600px]:grid-cols-3" method="get" action="/admin/content">
        <label className="text-sm text-text">
          Type
          <select
            name="kind"
            defaultValue={filters.kind ?? ""}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">All types</option>
            {CONTENT_KINDS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-text">
          State
          <select
            name="state"
            defaultValue={filters.state ?? ""}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">All states</option>
            {CONTENT_STATES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-12 self-end rounded-[var(--radius-control)] border border-control-border px-4 text-sm"
        >
          Apply filters
        </button>
      </form>
      <Link
        className="inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
        href="/admin/content/new"
      >
        New item
      </Link>
      {!loaded.ok ? (
        loaded.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState />
        )
      ) : loaded.data.length === 0 ? (
        <EmptyState title="No content" message="Nothing matches these filters." />
      ) : (
        <ul className="grid gap-3">
          {loaded.data.map((row) => {
            const item = row as Record<string, unknown>;
            return (
              <li key={asString(item.id)}>
                <Link
                  className="block rounded-[var(--radius-card)] border border-border bg-surface p-4"
                  href={`/admin/content/${asString(item.id)}`}
                >
                  <p className="text-sm font-medium text-text">{asString(item.title)}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {asString(item.kind)} · {asString(item.state)} · {asString(item.audience)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminChrome>
  );
}
