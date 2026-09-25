import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { isRecordingFeatureEnabled } from "@/domain/sessions/features";
import { loadCounselorQaList } from "@/server/modules/counseling/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Private coaching" };

export default async function CounselorCoachingIndexPage() {
  const result = await loadCounselorQaList();
  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const rows = Array.isArray(result.data)
    ? (result.data as Array<{
        bookingId: string;
        startsAt: string;
        sessionState: string;
        hasCoaching: boolean;
        flaggedInaccurate: boolean;
      }>)
    : [];
  const aiOn = isRecordingFeatureEnabled(process.env.GSC_FEATURE_RECORDING_AI);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Private coaching, AI-assisted</h1>
        <p className="mt-2 text-sm text-text-muted">
          Students, mentors and linked parents cannot open this screen. Coaching
          never appears on the student PDF.
        </p>
      </header>
      {!aiOn ? (
        <p className="text-sm text-text">
          AI coaching is off. Manual session reports still work.
        </p>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState
          title="No reviewed sessions"
          message="Completed sessions appear here after you end them."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.bookingId}>
              <Link
                className="block rounded-[var(--radius-card)] border border-border bg-surface p-4"
                href={`/counselor/coaching/${row.bookingId}`}
              >
                <p className="text-sm font-medium text-text">
                  {new Date(row.startsAt).toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {row.sessionState}
                  {row.hasCoaching ? " · Feedback ready" : " · Limited evidence"}
                  {row.flaggedInaccurate ? " · Flagged" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
