import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import {
  MODERATION_QUEUES,
  MODERATION_SEVERITIES,
  MODERATION_STATES,
  isModerationQueue,
} from "@/domain/news/news";
import { loadModerationQueue } from "@/server/modules/news/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Moderation" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string; severity?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const queue = filters.queue && isModerationQueue(filters.queue) ? filters.queue : "";
  const loaded = await loadModerationQueue(queue, filters.severity ?? "", filters.status ?? "");

  return (
    <AdminChrome
      title="Moderation, quality and safety"
      description="Reviews, message reports, stories and held feedback. Protected safety complaints stay hidden from routine moderators."
    >
      <form className="grid gap-3 min-[600px]:grid-cols-3" method="get" action="/admin/moderation">
        <label className="text-sm text-text">
          Queue
          <select
            name="queue"
            defaultValue={queue}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">All queues</option>
            {MODERATION_QUEUES.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-text">
          Severity
          <select
            name="severity"
            defaultValue={filters.severity ?? ""}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">Any</option>
            {MODERATION_SEVERITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-text">
          Status
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">Any</option>
            {MODERATION_STATES.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
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
      {!loaded.ok ? (
        loaded.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState />
        )
      ) : !Array.isArray(loaded.data.items) || loaded.data.items.length === 0 ? (
        <EmptyState title="Empty queue" message="Nothing matches these moderation filters." />
      ) : (
        <ul className="grid gap-3">
          {(loaded.data.items as unknown[]).map((row) => {
            const item = row as Record<string, unknown>;
            const id = asString(item.id);
            return (
              <li key={id}>
                <Link
                  className="block rounded-[var(--radius-card)] border border-border bg-surface p-4"
                  href={`/admin/moderation/${id}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneChip tone="warning" label={asString(item.queue)} />
                    <ToneChip tone="neutral" label={asString(item.status)} />
                    {item.protected === true ? (
                      <ToneChip tone="critical" label="Protected" />
                    ) : null}
                  </div>
                  <p className="mt-2 font-medium text-text">{asString(item.title)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminChrome>
  );
}
