import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { UserActions } from "@/app/(dashboard)/admin/users/[id]/UserActions";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { MICROCOPY } from "@/domain/microcopy";
import { getAdminUserSql } from "@/server/modules/admin/commands";
import { loadAdminCommand } from "@/server/modules/admin/load";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await loadAdminCommand((context) => getAdminUserSql(context, id));

  return (
    <AdminChrome
      title="Account"
      description="Role changes use set_user_role. A suspended counselor loses prospective access immediately."
    >
      {!result.ok ? (
        result.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState message={MICROCOPY.retryableError} />
        )
      ) : (
        <div className="grid gap-6 min-[900px]:grid-cols-2">
          <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <div className="flex flex-wrap gap-2">
              <ToneChip tone="neutral" label={result.data.homeRole} />
              <ToneChip
                tone={result.data.status === "suspended" ? "critical" : "neutral"}
                label={result.data.status}
              />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-text-muted">Name</dt>
                <dd className="text-text">{result.data.displayName ?? "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Email</dt>
                <dd className="text-text">{result.data.emailNormalized}</dd>
              </div>
              <div>
                <dt className="text-text-muted">GSC ID</dt>
                <dd className="text-text">{result.data.gscId ?? "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Roles</dt>
                <dd className="text-text">
                  {result.data.roles.length > 0
                    ? result.data.roles.join(", ")
                    : "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Counselor available</dt>
                <dd className="text-text">
                  {result.data.counselorAvailable ? "Yes" : "No"}
                </dd>
              </div>
            </dl>
          </section>
          <UserActions
            accountId={result.data.id}
            version={result.data.version}
            status={result.data.status}
          />
        </div>
      )}
    </AdminChrome>
  );
}
