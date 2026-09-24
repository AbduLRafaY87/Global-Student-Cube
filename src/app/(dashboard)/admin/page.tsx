import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { MICROCOPY } from "@/domain/microcopy";
import { listAdminOverviewSql } from "@/server/modules/admin/commands";
import { loadAdminCommand } from "@/server/modules/admin/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin overview",
};

export default async function AdminOverviewPage() {
  const result = await loadAdminCommand((context) => listAdminOverviewSql(context));

  return (
    <AdminChrome
      title="Operations overview"
      description="Live queues for the scopes assigned to you. Unpermitted counts are omitted, not shown as zero."
    >
      {!result.ok ? (
        result.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState message={MICROCOPY.retryableError} />
        )
      ) : result.data.queues.length === 0 ? (
        <p className="text-sm text-text-muted">
          No queues are assigned to your staff permissions.
        </p>
      ) : (
        <div className="grid gap-6 min-[900px]:grid-cols-2">
          <section aria-labelledby="admin-queues">
            <h2 id="admin-queues" className="text-lg font-semibold text-text">
              Queues
            </h2>
            <ul className="mt-3 grid gap-3">
              {result.data.queues.map((queue) => (
                <li key={queue.id}>
                  <Link
                    href={queue.href}
                    className="block rounded-[var(--radius-card)] border border-border bg-surface p-4"
                  >
                    <p className="text-sm text-text-muted">{queue.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-text">
                      {queue.count}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {result.data.recentAudit.length > 0 ? (
            <section aria-labelledby="admin-audit">
              <h2 id="admin-audit" className="text-lg font-semibold text-text">
                Recent audited actions
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {result.data.recentAudit.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <ToneChip tone="neutral" label={event.action} />
                      <span className="text-sm text-text-muted">
                        {new Date(event.occurred_at).toLocaleString()}
                      </span>
                    </div>
                    {event.reason ? (
                      <p className="mt-2 text-sm text-text">{event.reason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </AdminChrome>
  );
}
