import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { MICROCOPY } from "@/domain/microcopy";
import { listVerificationQueueSql } from "@/server/modules/admin/commands";
import { loadAdminCommand } from "@/server/modules/admin/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Professional review",
};

interface PageProps {
  searchParams: Promise<{
    kind?: string;
    state?: string;
    escalated?: string;
  }>;
}

export default async function ApprovalsPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const result = await loadAdminCommand((context) =>
    listVerificationQueueSql(context, {
      kind: filters.kind ?? null,
      state: filters.state ?? null,
      escalated: filters.escalated === "1",
      limit: 20,
      offset: 0,
    }),
  );

  return (
    <AdminChrome
      title="Professional and guardian review"
      description="Counselors, companies and mentors only. There is no student approval queue. Guardian-link items are minors’ parent links."
    >
      <form
        className="grid gap-3 min-[600px]:grid-cols-3"
        method="get"
        action="/admin/approvals"
      >
        <label className="flex flex-col text-sm text-text">
          Kind
          <select
            name="kind"
            defaultValue={filters.kind ?? ""}
            className="mt-2 h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">All reviewable</option>
            <option value="professional">Professional</option>
            <option value="counselor">Counselor</option>
            <option value="mentor">Mentor</option>
            <option value="company">Company</option>
            <option value="guardian_link">Guardian link</option>
          </select>
        </label>
        <label className="flex flex-col text-sm text-text">
          State
          <select
            name="state"
            defaultValue={filters.state ?? ""}
            className="mt-2 h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">All states</option>
            <option value="pending">Pending</option>
            <option value="needs_information">Needs information</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end text-sm text-text">
          <input
            type="checkbox"
            name="escalated"
            value="1"
            defaultChecked={filters.escalated === "1"}
          />
          Older than seven days
        </label>
        <button
          type="submit"
          className="h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-4 text-sm font-medium min-[600px]:col-span-3 min-[900px]:col-span-1"
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
          title="Nothing in this queue"
          message="No professional or guardian-link reviews match these filters."
        />
      ) : (
        <ul className="grid gap-3">
          {result.data.items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/admin/approvals/${item.id}`}
                className="block rounded-[var(--radius-card)] border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ToneChip tone="neutral" label={item.kind.split("_").join(" ")} />
                  <ToneChip
                    tone={item.state === "approved" ? "positive" : "warning"}
                    label={item.state.split("_").join(" ")}
                  />
                  {item.escalation_due ? (
                    <ToneChip tone="critical" label="Escalation due" />
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-text">{item.email_normalized}</p>
                <p className="mt-1 text-sm text-text-muted">
                  Submitted {new Date(item.submitted_at).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminChrome>
  );
}
