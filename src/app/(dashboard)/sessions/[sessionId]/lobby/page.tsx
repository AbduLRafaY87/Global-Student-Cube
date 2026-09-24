import { LobbyClient } from "@/app/(dashboard)/sessions/[sessionId]/lobby/LobbyClient";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { countdownMs, joinWindowOpen } from "@/domain/sessions/attendance";
import { recordingStatusLabel } from "@/domain/sessions/display";
import type { RecordingState } from "@/domain/sessions/consent";
import { loadSessionWorkspace } from "@/server/modules/sessions/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Session lobby" };

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionLobbyPage({ params }: PageProps) {
  const { sessionId } = await params;
  const result = await loadSessionWorkspace(sessionId);
  const now = new Date().toISOString();

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }

  const session = result.data;
  const allowed = joinWindowOpen(session.startsAt, now);
  const remaining = countdownMs(session.startsAt, now);
  const minutes = Math.ceil(remaining / 60000);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-sm text-text-muted">Session lobby</p>
        <h1 className="mt-1 text-2xl font-semibold text-text">Equipment check</h1>
        <p className="mt-2 text-sm text-text-muted">
          Device check and entering the lobby do not record consent.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ToneChip tone="neutral" label={session.actorRole} />
          <ToneChip
            tone="neutral"
            label={recordingStatusLabel(session.recordingState as RecordingState)}
          />
        </div>
      </header>
      <LobbyClient
        sessionId={session.id}
        joinOpensAt={session.joinOpensAt}
        joinAllowed={allowed}
        countdownLabel={
          allowed ? "You can join now." : `About ${minutes} minute(s) remaining.`
        }
      />
      <nav className="flex flex-col gap-3">
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-control-border px-4 text-text"
          href={`/sessions/${session.id}/consent`}
        >
          Review recording choices
        </Link>
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] px-4 text-primary underline-offset-2 hover:underline"
          href={`/sessions/${session.id}`}
        >
          Back to appointment
        </Link>
      </nav>
    </div>
  );
}
