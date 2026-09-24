import { FamilyLinkActions } from "@/components/parent/FamilyLinkActions";
import { GuardianCaseForm } from "@/components/parent/GuardianCaseForm";
import { InviteParentForm } from "@/components/parent/InviteParentForm";
import { EmptyState } from "@/components/ui/States";
import { isActiveParentLink } from "@/domain/parent/access";
import { resolveUserRole } from "@/domain/roles";
import { createClient } from "@/lib/supabase/server";
import { loadParentFamilyOrNull } from "@/server/modules/parent/commands";
import { loadStudentFamily } from "@/server/modules/parent/load";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Family linkage" };

interface PageProps {
  searchParams: Promise<{ caseId?: string }>;
}

export default async function FamilyLinksPage({ searchParams }: PageProps) {
  const { caseId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = resolveUserRole(profile?.role);

  if (role === "parent") {
    const family = await loadParentFamilyOrNull();
    if (!family) {
      redirect("/login");
    }
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold text-text">Family linkage</h1>
        <p className="text-sm text-text-muted">
          Sharing a surname grants no access. Adult authorization is student-granted.
          Links for minors wait in the admin verification queue.
        </p>
        {family.links.length === 0 ? (
          <EmptyState
            title="No family links"
            message="Accept an invitation from a student, or create a guardian-operated case for a child under 13."
          />
        ) : (
          <ul className="space-y-4">
            {family.links.map((link) => (
              <li key={link.id} className="rounded-[var(--radius-card)] border border-border p-4">
                <h2 className="text-lg font-semibold text-text">{link.studentName}</h2>
                <p className="mt-1 text-sm text-text-muted">
                  {link.kind} · {link.status}
                </p>
                <p className="mt-3">
                  <Link
                    href={`/family-links/${link.id}`}
                    className="font-medium text-primary underline"
                  >
                    Review permissions
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        )}
        <GuardianCaseForm />
      </div>
    );
  }

  const family = await loadStudentFamily(user.id, caseId);
  if (!family) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <EmptyState
          title="No case to share"
          message="Finish creating your student case before inviting a parent."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-text">Family linkage</h1>
      <p className="text-sm text-text-muted">
        Invite a parent by email or GSC ID. Matching is never automatic. Adults you
        authorize can help immediately; guardian links for minors go to verification.
      </p>
      <InviteParentForm caseId={family.caseId} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Current links</h2>
        {family.links.length === 0 ? (
          <p className="text-sm text-text-muted">No parent links yet.</p>
        ) : (
          <ul className="space-y-4">
            {family.links.map((link) => (
              <li key={link.id} className="rounded-[var(--radius-card)] border border-border p-4">
                <p className="text-sm text-text">
                  {link.kind} · {link.status}
                  {isActiveParentLink({ status: link.status, revokedAt: link.revokedAt })
                    ? " · active"
                    : ""}
                </p>
                <p className="mt-2 text-sm text-text-muted">
                  {link.scopes.join(", ") || "No live grants"}
                </p>
                <div className="mt-4">
                  <FamilyLinkActions
                    linkId={link.id}
                    currentScopes={link.scopes}
                    canEditScopes={link.active}
                    canRevoke={link.status !== "revoked"}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Invitations</h2>
        {family.invitations.length === 0 ? (
          <p className="text-sm text-text-muted">No invitations yet.</p>
        ) : (
          <ul className="space-y-3">
            {family.invitations.map((invite) => (
              <li key={invite.id} className="rounded-[var(--radius-card)] border border-border p-4 text-sm">
                {invite.targetHint}. Status{" "}
                {invite.revokedAt
                  ? "revoked"
                  : invite.acceptedAt
                    ? "accepted"
                    : "pending"}
                . Expires {invite.expiresAt.slice(0, 10)}.
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
