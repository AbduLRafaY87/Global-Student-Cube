import { CaseSwitcher } from "@/components/parent/CaseSwitcher";
import { EmptyState } from "@/components/ui/States";
import { isActiveParentLink, parentCan } from "@/domain/parent/access";
import { displayText } from "@/domain/catalog/display";
import { loadParentFamilyOrNull } from "@/server/modules/parent/commands";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Parent dashboard" };

interface PageProps {
  searchParams: Promise<{ caseId?: string }>;
}

function linkStatusCopy(status: string, revokedAt: string | null): string {
  if (revokedAt || status === "revoked") {
    return "This relationship was revoked. Access ended immediately.";
  }
  if (status === "accepted_pending_verification") {
    return "This relationship is waiting for guardian verification. Only the status is visible.";
  }
  if (status === "invited") {
    return "This invitation is still pending.";
  }
  if (status === "declined" || status === "expired") {
    return `This relationship is ${status}.`;
  }
  return "This relationship is active.";
}

export default async function ParentHomePage({ searchParams }: PageProps) {
  const { caseId: requested } = await searchParams;
  const family = await loadParentFamilyOrNull();
  if (!family) {
    redirect("/login");
  }
  const selectable = family.links.filter((link) =>
      isActiveParentLink({ status: link.status, revokedAt: link.revokedAt }),
    );
    const selected =
      selectable.find((link) => link.caseId === requested) ?? selectable[0] ?? null;
    const pendingSelected = requested
      ? family.links.find((link) => link.caseId === requested && !isActiveParentLink({
          status: link.status,
          revokedAt: link.revokedAt,
        }))
      : null;

    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <header className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text">Family overview</h1>
            <p className="mt-2 text-sm text-text-muted">
              Balances are never combined across children.
            </p>
          </div>
          <CaseSwitcher
            cases={selectable.map((link) => ({
              caseId: link.caseId,
              studentName: link.studentName,
            }))}
            selectedCaseId={selected?.caseId ?? null}
          />
        </header>

        {pendingSelected ? (
          <div className="rounded-[var(--radius-card)] border border-warning bg-warning-bg p-4">
            <p className="text-sm text-text">
              {linkStatusCopy(pendingSelected.status, pendingSelected.revokedAt)}
            </p>
          </div>
        ) : null}

        {!selected ? (
          <EmptyState
            title="No linked student yet"
            message="A student must invite you, or you can create a guardian-operated case for a child under 13."
            action={
              <Link
                href="/family-links"
                className="inline-flex h-12 items-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
              >
                Link a student
              </Link>
            }
          />
        ) : (
          <>
            <div className="rounded-[var(--radius-card)] border border-border p-4">
              <p className="text-sm text-text">
                {linkStatusCopy(selected.status, selected.revokedAt)}
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Next step for {selected.studentName}:{" "}
                {selected.module3CompletedAt
                  ? "Explore universities for this case."
                  : selected.module2CompletedAt
                    ? "Complete parent and financial information."
                    : "Finish the academic profile."}
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Module 2 {selected.module2CompletedAt ? "complete" : "in progress"}. Module 3{" "}
                {selected.module3CompletedAt ? "complete" : "in progress"}.
              </p>
              <p className="mt-4">
                <Link
                  href={
                    selected.module3CompletedAt
                      ? `/explore/universities`
                      : selected.module2CompletedAt
                        ? `/cases/${selected.caseId}/profile/finances`
                        : `/cases/${selected.caseId}/profile/education`
                  }
                  className="inline-flex h-12 items-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
                >
                  Continue this student’s plan
                </Link>
              </p>
            </div>

            <div className="grid gap-4 min-[768px]:grid-cols-2">
              {parentCan(selected.scopes, "finance.read", true) ? (
                <article className="rounded-[var(--radius-card)] border border-border p-4">
                  <h2 className="text-lg font-semibold text-text">Finance</h2>
                  <p className="mt-2 text-sm text-text-muted">
                    {selected.module3CompletedAt
                      ? "Financial section complete."
                      : "Financial section not complete."}
                  </p>
                  <Link
                    href={`/cases/${selected.caseId}/profile/finances`}
                    className="mt-3 inline-flex min-h-12 items-center text-sm font-medium text-primary underline"
                  >
                    Open finances
                  </Link>
                </article>
              ) : (
                <article className="rounded-[var(--radius-card)] border border-border p-4">
                  <h2 className="text-lg font-semibold text-text">Finance</h2>
                  <p className="mt-2 text-sm text-text-muted">Not shared</p>
                </article>
              )}
              {parentCan(selected.scopes, "shortlist.read", true) ? (
                <article className="rounded-[var(--radius-card)] border border-border p-4">
                  <h2 className="text-lg font-semibold text-text">Saved universities</h2>
                  <p className="mt-2 text-sm text-text-muted">
                    Saved programs for this student only.
                  </p>
                  <Link
                    href={`/cases/${selected.caseId}/shortlist`}
                    className="mt-3 inline-flex min-h-12 items-center text-sm font-medium text-primary underline"
                  >
                    Open shortlist
                  </Link>
                </article>
              ) : null}
              {parentCan(selected.scopes, "report.read", true) ? (
                <article className="rounded-[var(--radius-card)] border border-border p-4">
                  <h2 className="text-lg font-semibold text-text">Shared advisory</h2>
                  <p className="mt-2 text-sm text-text-muted">No shared advisory yet.</p>
                </article>
              ) : null}
              <article className="rounded-[var(--radius-card)] border border-border p-4">
                <h2 className="text-lg font-semibold text-text">Invitations</h2>
                <p className="mt-2 text-sm text-text-muted">
                  {family.pendingInvitations.length} pending invitation
                  {family.pendingInvitations.length === 1 ? "" : "s"} on this account.
                </p>
                <Link
                  href="/family-links"
                  className="mt-3 inline-flex min-h-12 items-center text-sm font-medium text-primary underline"
                >
                  Review family access
                </Link>
              </article>
            </div>

            <article className="rounded-[var(--radius-card)] border border-border p-4">
              <h2 className="text-lg font-semibold text-text">Mentorship and learning</h2>
              <p className="mt-2 text-sm text-text-muted">
                Parent mentoring rewards stay on this account. They are not attributed to{" "}
                {displayText(selected.studentName)}.
              </p>
              <Link
                href="/explore/scholarships"
                className="mt-3 inline-flex min-h-12 items-center text-sm font-medium text-primary underline"
              >
                Scholarships
              </Link>
            </article>
          </>
        )}
      </div>
    );
}
