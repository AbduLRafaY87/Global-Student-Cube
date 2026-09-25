import { CoachingActions } from "@/app/(dashboard)/counselor/coaching/[sessionId]/CoachingActions";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { isRecordingFeatureEnabled } from "@/domain/sessions/features";
import { loadCounselorQa } from "@/server/modules/counseling/load";
import { Lightbulb } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Private coaching" };

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export default async function CounselorCoachingPage({ params }: PageProps) {
  const { sessionId } = await params;
  const result = await loadCounselorQa(sessionId);
  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const findings = result.data.findings as
    | { findings?: unknown; preparation?: unknown; transcriptRefs?: unknown }
    | null;
  const transcriptState =
    typeof result.data.transcriptState === "string" ? result.data.transcriptState : null;
  const aiOn = isRecordingFeatureEnabled(process.env.GSC_FEATURE_RECORDING_AI);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Private coaching, AI-assisted</h1>
        <p className="mt-2 text-sm text-text-muted">
          This stays a staff artifact. It is never copied into the student advisory.
        </p>
      </header>
      {transcriptState === "ready" ? (
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
            <Lightbulb className="size-5" aria-hidden />
            Answer gaps
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text">
            {stringList(findings?.findings).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {stringList(findings?.transcriptRefs).map((ref) => (
            <p key={ref} className="mt-2 text-sm text-text-muted">
              Transcript reference: {ref}
            </p>
          ))}
        </section>
      ) : (
        <p className="text-sm text-text">
          {transcriptState === "expired"
            ? "The transcript expired. Approved feedback can remain; playback references are removed."
            : "Limited evidence. No invented quote. Use the manual report if transcription is absent."}
        </p>
      )}
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
          <Lightbulb className="size-5" aria-hidden />
          Suggested preparation
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text">
          {stringList(findings?.preparation).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <CoachingActions
        sessionId={sessionId}
        aiEnabled={aiOn}
        initialResponse={
          typeof result.data.counselorResponse === "string"
            ? result.data.counselorResponse
            : ""
        }
      />
      <nav className="flex flex-col gap-3">
        <Link
          className="text-sm text-primary underline-offset-2 hover:underline"
          href={`/counselor/sessions/${sessionId}/report`}
        >
          Open session report
        </Link>
        <Link className="text-sm text-primary underline-offset-2 hover:underline" href="/counselor/coaching">
          All reviewed sessions
        </Link>
      </nav>
    </div>
  );
}
