import { FeedbackForm } from "@/app/(dashboard)/sessions/[sessionId]/feedback/FeedbackForm";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadSessionWorkspace } from "@/server/modules/sessions/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Session feedback" };

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionFeedbackPage({ params }: PageProps) {
  const { sessionId } = await params;
  const session = await loadSessionWorkspace(sessionId);
  if (!session.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {session.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const expert =
    session.data.actorRole === "counselor" || session.data.actorRole === "mentor";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Counseling feedback</h1>
        <p className="mt-2 text-sm text-text-muted">
          One response per attended completed session. Canceled or no-show
          meetings cannot be rated.
        </p>
      </header>
      <FeedbackForm
        sessionId={sessionId}
        direction={expert ? "counselor_to_student" : "student_to_counselor"}
        returnTo={
          expert
            ? `/counselor/students/${session.data.caseId ?? ""}`
            : `/sessions/${sessionId}/report`
        }
      />
      <Link className="text-sm text-primary underline-offset-2 hover:underline" href="/help">
        Report a safety concern
      </Link>
      {session.data.caseId ? (
        <Link
          className="text-sm text-primary underline-offset-2 hover:underline"
          href={`/cases/${session.data.caseId}/change-counselor`}
        >
          Request another counselor
        </Link>
      ) : null}
    </div>
  );
}
