import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { MICROCOPY } from "@/domain/microcopy";
import { listAuditEventsSql } from "@/server/modules/admin/commands";
import { loadAdminCommand } from "@/server/modules/admin/load";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit",
};

interface PageProps {
  searchParams: Promise<{
    actor?: string;
    target?: string;
    action?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const result = await loadAdminCommand((context) =>
    listAuditEventsSql(context, {
      actorId: filters.actor || null,
      targetId: filters.target || null,
      action: filters.action || null,
      from: filters.from || null,
      to: filters.to || null,
      limit: 20,
      offset: 0,
    }),
  );

  return (
    <AdminChrome
      title="Audit log"
      description="Every privileged transition records actor, reason and version. Filter by actor, target, action or date."
    >
      <form className="grid gap-3 min-[600px]:grid-cols-2" method="get">
        <label className="text-sm text-text">
          Actor UUID
          <input
            name="actor"
            defaultValue={filters.actor ?? ""}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <label className="text-sm text-text">
          Target UUID
          <input
            name="target"
            defaultValue={filters.target ?? ""}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <label className="text-sm text-text">
          Action
          <input
            name="action"
            defaultValue={filters.action ?? ""}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-text">
            From
            <input
              type="date"
              name="from"
              defaultValue={filters.from ?? ""}
              className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
            />
          </label>
          <label className="text-sm text-text">
            To
            <input
              type="date"
              name="to"
              defaultValue={filters.to ?? ""}
              className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
            />
          </label>
        </div>
        <button
          type="submit"
          className="h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-4 text-sm font-medium min-[600px]:col-span-2"
        >
          Apply filters
        </button>
      </form>

      {!result.ok ? (
        result.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState message={MICROCOPY.retryableError} />
        )
      ) : result.data.items.length === 0 ? (
        <EmptyState
          filtered
          title="No audit rows"
          message="No events match these filters."
        />
      ) : (
        <ul className="grid gap-3">
          {result.data.items.map((event) => (
            <li
              key={event.id}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm"
            >
              <p className="font-medium text-text">{event.action}</p>
              <p className="mt-1 text-text-muted">
                {new Date(event.occurred_at).toLocaleString()}
              </p>
              <p className="mt-2 text-text">
                Actor {event.actor_id ?? "Not provided"} · Target{" "}
                {event.resource_id ?? "Not provided"}
              </p>
              <p className="mt-1 text-text">
                Reason: {event.reason ?? "Not provided"}
              </p>
              {event.safe_diff?.version !== undefined ? (
                <p className="mt-1 text-text-muted">
                  Version {String(event.safe_diff.version)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AdminChrome>
  );
}
