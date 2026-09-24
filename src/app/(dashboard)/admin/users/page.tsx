import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { InviteUserForm } from "@/app/(dashboard)/admin/users/InviteUserForm";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { MICROCOPY } from "@/domain/microcopy";
import { searchAdminUsersSql } from "@/server/modules/admin/commands";
import { loadAdminCommand } from "@/server/modules/admin/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "People",
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const result = await loadAdminCommand((context) =>
    searchAdminUsersSql(context, { query: q, limit: 20, offset: 0 }),
  );

  return (
    <AdminChrome
      title="People"
      description="Search accounts, invite staff, and open a record to suspend, restore or change role."
    >
      <form className="flex flex-col gap-3 min-[600px]:flex-row" method="get">
        <label className="flex-1 text-sm text-text">
          Search
          <input
            name="q"
            defaultValue={q}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
            placeholder="Email, name or GSC ID"
          />
        </label>
        <button
          type="submit"
          className="h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-4 text-sm font-medium min-[600px]:self-end"
        >
          Search
        </button>
      </form>

      <InviteUserForm />

      {!result.ok ? (
        result.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState message={MICROCOPY.retryableError} />
        )
      ) : result.data.items.length === 0 ? (
        <EmptyState
          filtered={Boolean(q)}
          title="No people match"
          message="Try another email, name or GSC ID."
        />
      ) : (
        <ul className="grid gap-3">
          {result.data.items.map((user) => (
            <li key={user.id}>
              <Link
                href={`/admin/users/${user.id}`}
                className="block rounded-[var(--radius-card)] border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap gap-2">
                  <ToneChip tone="neutral" label={user.home_role} />
                  <ToneChip
                    tone={user.status === "suspended" ? "critical" : "neutral"}
                    label={user.status}
                  />
                </div>
                <p className="mt-2 text-sm text-text">
                  {user.display_name ?? user.email_normalized}
                </p>
                <p className="mt-1 text-sm text-text-muted">{user.email_normalized}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminChrome>
  );
}
