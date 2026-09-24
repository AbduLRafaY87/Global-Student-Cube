import { LiveSession } from "@/app/(session)/sessions/[sessionId]/live/LiveSession";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import type { RecordingState } from "@/domain/sessions/consent";
import { loadSessionWorkspace } from "@/server/modules/sessions/load";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Live session" };

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function LiveSessionPage({ params }: PageProps) {
  const { sessionId } = await params;
  const result = await loadSessionWorkspace(sessionId);

  if (!result.ok) {
    return (
      <div className="p-6">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }

  const session = result.data;
  return (
    <LiveSession
      sessionId={session.id}
      title={`${session.kind} session`}
      startsAt={session.startsAt}
      recordingState={session.recordingState as RecordingState}
      isHost={session.actorRole === "counselor" || session.actorRole === "mentor"}
    />
  );
}
