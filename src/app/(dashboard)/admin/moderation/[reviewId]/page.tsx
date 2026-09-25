import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { ModerationActions } from "@/components/news/ModerationActions";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadModerationReview } from "@/server/modules/news/load";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Moderation review" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminModerationReviewPage({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = await params;
  const loaded = await loadModerationReview(reviewId);

  return (
    <AdminChrome
      title="Review item"
      description="Preview precedes the reason field. Publishing a story or spotlight still needs subject consent."
    >
      {!loaded.ok ? (
        loaded.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState />
        )
      ) : loaded.data.protected === true && loaded.data.context == null ? (
        <EmptyState
          title="Protected safety case"
          message="Routine moderators cannot read protected safety complaints."
        />
      ) : (
        <div className="grid gap-6 min-[900px]:grid-cols-[1.2fr_1fr]">
          <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold text-text">{asString(loaded.data.title)}</h2>
            <p className="mt-2 text-sm text-text-muted">
              {asString(loaded.data.queue)} · {asString(loaded.data.status)}
            </p>
            <p className="mt-4 whitespace-pre-wrap text-sm text-text">
              {asString(loaded.data.context)}
            </p>
            {asString(loaded.data.body) ? (
              <p className="mt-4 whitespace-pre-wrap text-sm text-text">{asString(loaded.data.body)}</p>
            ) : null}
            <p className="mt-4 text-sm text-text-muted">
              Publication consent: {loaded.data.publicationConsent === true ? "yes" : "no"}.
              Spotlight consent: {loaded.data.spotlightConsent === true ? "yes" : "no"}.
              Name consent: {loaded.data.nameConsent === true ? "yes" : "no"}.
            </p>
            {asString(loaded.data.consentEvidence) ? (
              <p className="mt-2 text-sm text-text-muted">
                Consent evidence: {asString(loaded.data.consentEvidence)}
              </p>
            ) : null}
          </section>
          <ModerationActions id={reviewId} canEscalate />
        </div>
      )}
    </AdminChrome>
  );
}
