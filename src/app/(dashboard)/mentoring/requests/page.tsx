import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { labelForTaxonomy } from "@/domain/mentorship/taxonomy";
import { loadMentorRequests } from "@/server/modules/mentorship/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentoring requests" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function MentoringRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = typeof params.tab === "string" ? params.tab : "incoming";
  const loaded = await loadMentorRequests(tab, null);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const items = Array.isArray(loaded.data.items) ? loaded.data.items : [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Requests and connections</h1>
        <p className="mt-2 text-sm text-text-muted">
          Mentors see consented requests, not a directory of all registered students.
        </p>
      </header>
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link className="text-primary underline-offset-2 hover:underline" href="/mentoring/requests?tab=incoming">
          Incoming
        </Link>
        <Link className="text-primary underline-offset-2 hover:underline" href="/mentoring/requests?tab=outgoing">
          Outgoing
        </Link>
        <Link className="text-primary underline-offset-2 hover:underline" href="/mentoring/requests?tab=accepted">
          Accepted
        </Link>
      </nav>
      {items.length === 0 ? (
        <EmptyState
          title="No requests"
          message="Open the mentor community to find a verified mentor."
          action={
            <Link className="text-primary underline-offset-2 hover:underline" href="/mentors">
              Browse mentors
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((row) => {
            const item = row as Record<string, unknown>;
            return (
              <li key={asString(item.id)} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <p className="text-sm font-medium text-text">{asString(item.counterpartyName)}</p>
                <p className="text-sm text-text-muted">
                  {asArray(item.topics).map(labelForTaxonomy).join(" · ")} · {asString(item.state)}
                </p>
                <p className="mt-2 text-sm text-text">{asString(item.purpose)}</p>
                <Link
                  className="mt-3 inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
                  href={`/mentoring/requests/${asString(item.id)}`}
                >
                  Open request
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
