import { MentoringSummaryForm } from "@/components/mentorship/MentoringSummaryForm";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadMentoringSummary } from "@/server/modules/mentorship/load";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentor session summary" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "Not provided";
}

export default async function MentoringSummaryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const loaded = await loadMentoringSummary(sessionId);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const data = loaded.data;
  if (!data.bookingId) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <EmptyState title="Session not found" message="This mentoring session is not available." />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Session summary and feedback</h1>
        <p className="mt-2 text-sm text-text-muted">
          {asString(data.mentorName)} · {asString(data.menteeName)} · {asString(data.startsAt)}
        </p>
        {data.verified === true ? (
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-text">
            <CheckCircle className="size-4" aria-hidden />
            Verified after review
          </p>
        ) : (
          <p className="mt-2 text-sm text-text-muted">
            Feedback completion remains pending admin. 25 points are awarded once only after logged,
            rated and admin-approved completion.
          </p>
        )}
      </header>
      <Link className="text-primary underline-offset-2 hover:underline" href={`/sessions/${sessionId}`}>
        View session
      </Link>
      <MentoringSummaryForm
        bookingId={sessionId}
        isMentor={data.isMentor === true}
        isParentMentee={data.isParentMentee === true}
        sessionState={asString(data.sessionState)}
      />
    </div>
  );
}
