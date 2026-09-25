import { MentorRequestActions } from "@/components/mentorship/MentorRequestActions";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { labelForTaxonomy } from "@/domain/mentorship/taxonomy";
import { loadMentorRequests } from "@/server/modules/mentorship/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentoring request" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function MentoringRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const loaded = await loadMentorRequests("accepted", requestId);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const selected = loaded.data.selected;
  if (!selected) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <EmptyState title="Request not found" message="This request is not available." />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Link className="text-sm text-primary underline-offset-2 hover:underline" href="/mentoring/requests">
        Back to requests
      </Link>
      <header>
        <h1 className="text-2xl font-semibold text-text">{asString(selected.counterpartyName)}</h1>
        <p className="mt-2 text-sm text-text-muted">
          {asArray(selected.topics).map(labelForTaxonomy).join(" · ")} · {asString(selected.state)}
        </p>
      </header>
      <p className="text-sm text-text">{asString(selected.purpose)}</p>
      <MentorRequestActions
        requestId={asString(selected.id)}
        state={asString(selected.state)}
        isMentor={selected.isMentor === true}
        conversationId={typeof selected.conversationId === "string" ? selected.conversationId : null}
      />
    </div>
  );
}
