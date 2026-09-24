import { ReportEditor } from "@/app/(dashboard)/counselor/sessions/[sessionId]/report/ReportEditor";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadCounselorAdvisory } from "@/server/modules/counseling/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Session report" };

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function CounselorReportPage({ params }: PageProps) {
  const { sessionId } = await params;
  const result = await loadCounselorAdvisory(sessionId);
  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const body = result.data.shareableBody as { guidance?: string } | null;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Session report</h1>
        <p className="mt-2 text-sm text-text-muted">
          Approve creates the student-visible SES-09 version. AI cannot auto-deliver.
        </p>
      </header>
      <ReportEditor
        sessionId={sessionId}
        status={String(result.data.status ?? "")}
        initialGuidance={typeof body?.guidance === "string" ? body.guidance : ""}
        initialNotes={typeof result.data.privateNotes === "string" ? result.data.privateNotes : ""}
        dueLabel={
          typeof result.data.dueAt === "string"
            ? new Date(result.data.dueAt).toLocaleString()
            : "Not provided"
        }
      />
      <Link
        className="text-sm text-primary underline-offset-2 hover:underline"
        href={`/sessions/${sessionId}/feedback`}
      >
        Submit student feedback
      </Link>
    </div>
  );
}
