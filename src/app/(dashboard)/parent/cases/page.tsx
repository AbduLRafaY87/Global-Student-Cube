import { EmptyState } from "@/components/ui/States";
import { isActiveParentLink } from "@/domain/parent/access";
import { displayText } from "@/domain/catalog/display";
import { loadParentFamilyOrNull } from "@/server/modules/parent/commands";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Student cases" };

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

function ageYears(dob: string | null): string {
  if (!dob) {
    return "Not provided";
  }
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) {
    return "Not provided";
  }
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) {
    years -= 1;
  }
  if (years < 13) {
    return "Under 13";
  }
  if (years < 18) {
    return "13–17";
  }
  return "18+";
}

export default async function ParentCasesPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const family = await loadParentFamilyOrNull();
  if (!family) {
    redirect("/login");
  }
  const query = (q ?? "").trim().toLowerCase();
    const authorized = family.links.filter((link) =>
      isActiveParentLink({ status: link.status, revokedAt: link.revokedAt }),
    );
    const visible = query
      ? authorized.filter((link) => {
          const haystack = `${link.studentName} ${link.gscId ?? ""} ${link.caseId}`.toLowerCase();
          return haystack.includes(query);
        })
      : authorized;

    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-semibold text-text">Student cases</h1>
          <p className="mt-2 text-sm text-text-muted">
            Opening a case never changes this parent role.
          </p>
        </header>

        <form className="flex flex-col gap-3 min-[640px]:flex-row" method="get">
          <label className="block flex-1 text-sm font-medium text-text" htmlFor="case-search">
            Search authorized cases
            <input
              id="case-search"
              name="q"
              defaultValue={q ?? ""}
              className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-surface min-[640px]:mt-7"
          >
            Search
          </button>
        </form>

        {visible.length === 0 ? (
          <EmptyState
            title="No approved links yet"
            message="Invite or create a case from family access. A revoked case cannot be selected."
            action={
              <Link
                href="/family-links"
                className="inline-flex h-12 items-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
              >
                Link or create case
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 min-[768px]:grid-cols-2">
            {visible.map((link) => (
              <li
                key={link.id}
                className="rounded-[var(--radius-card)] border border-border p-4"
              >
                <h2 className="text-lg font-semibold text-text">
                  {displayText(link.studentName)}
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  {link.gscId ?? "Not provided"} · {ageYears(link.studentDob)}
                </p>
                <p className="mt-2 flex flex-wrap gap-2 text-xs">
                  {link.scopes.length === 0
                    ? "No scopes"
                    : link.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="rounded-[var(--radius-control)] border border-border px-2 py-1"
                        >
                          {scope}
                        </span>
                      ))}
                </p>
                <p className="mt-2 text-sm text-text-muted">
                  Updated {link.updatedAt ? link.updatedAt.slice(0, 10) : "Not provided"}
                </p>
                <Link
                  href={`/parent/home?caseId=${link.caseId}`}
                  className="mt-4 inline-flex h-12 items-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
                >
                  Open case
                </Link>
              </li>
            ))}
          </ul>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">Pending invitations</h2>
          {family.pendingInvitations.length === 0 ? (
            <p className="text-sm text-text-muted">No pending invitations.</p>
          ) : (
            <ul className="space-y-3">
              {family.pendingInvitations.map((invite) => (
                <li
                  key={invite.id}
                  className="rounded-[var(--radius-card)] border border-border p-4 text-sm"
                >
                  Invitation for case {invite.caseId.slice(0, 8)}… expires{" "}
                  {invite.expiresAt.slice(0, 10)}. Use the emailed link to authorize access.
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/family-links"
            className="inline-flex h-12 items-center rounded-[var(--radius-control)] border border-control-border px-4"
          >
            Link or create case
          </Link>
        </section>
      </div>
    );
}
