import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { ReviewActions } from "@/app/(dashboard)/admin/approvals/ReviewActions";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { MICROCOPY } from "@/domain/microcopy";
import { getVerificationCaseSql } from "@/server/modules/admin/commands";
import { loadAdminCommand } from "@/server/modules/admin/load";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review case",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApprovalDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await loadAdminCommand((context) =>
    getVerificationCaseSql(context, id),
  );

  return (
    <AdminChrome
      title="Review case"
      description="Identity and professional evidence stay on this page. The overview never loads it."
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
              <ToneChip tone="neutral" label={result.data.kind.split("_").join(" ")} />
              <ToneChip tone="warning" label={result.data.state.split("_").join(" ")} />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-text-muted">Account</dt>
                <dd className="text-text">{result.data.accountId}</dd>
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
                <dt className="text-text-muted">Submitted</dt>
                <dd className="text-text">
                  {new Date(result.data.submittedAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Escalates</dt>
                <dd className="text-text">
                  {new Date(result.data.escalatesAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Community declaration</dt>
                <dd className="text-text">
                  {result.data.hasCommunityDeclaration
                    ? "On file (verification-only)"
                    : "Not provided"}
                </dd>
              </div>
              {result.data.evidence.parentLinkId ? (
                <div>
                  <dt className="text-text-muted">Parent link</dt>
                  <dd className="text-text">{result.data.evidence.parentLinkId}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-text-muted">Internal comment</dt>
                <dd className="text-text">
                  {result.data.internalComment ?? "Not provided"}
                </dd>
              </div>
            </dl>
          </section>
          <ReviewActions
            caseId={result.data.id}
            version={result.data.version}
            canEscalate={result.data.escalationDue}
          />
        </div>
      )}
    </AdminChrome>
  );
}
