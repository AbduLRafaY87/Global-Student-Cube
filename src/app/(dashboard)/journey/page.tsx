import { MilestoneForm } from "@/components/journey/MilestoneForm";
import { StorySubmitForm } from "@/components/news/StorySubmitForm";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { displayText, NOT_PROVIDED } from "@/domain/catalog/display";
import {
  canBecomeMentor,
  deriveJourneyState,
  flagInconsistentDates,
  JOURNEY_STATE_LABELS,
  MILESTONE_KINDS,
  MILESTONE_LABELS,
  SELF_REPORTED_LABEL,
  timeToInternship,
  timeToPlacement,
  VERIFICATION_LABELS,
  type JourneyMilestone,
  type MilestoneKind,
  type MilestoneVerification,
} from "@/domain/journey/milestones";
import { createClient } from "@/lib/supabase/server";
import { loadJourneyMilestones } from "@/server/modules/journey/load";
import { resolveAccessibleCase } from "@/server/modules/profile/load";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private journey",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asKind(value: unknown): MilestoneKind | null {
  return typeof value === "string" && MILESTONE_KINDS.includes(value as MilestoneKind)
    ? (value as MilestoneKind)
    : null;
}

function asVerification(value: unknown): MilestoneVerification {
  return typeof value === "string" && value in VERIFICATION_LABELS
    ? (value as MilestoneVerification)
    : "self_reported";
}

export default async function JourneyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const caseRow = await resolveAccessibleCase(user.id);
  if (!caseRow) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <EmptyState
          title="No accessible case"
          message="Private milestones appear after a student case is available."
        />
      </div>
    );
  }

  const result = await loadJourneyMilestones(caseRow.id);
  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }

  const rawItems = Array.isArray(result.data.items) ? result.data.items : [];
  const milestones: Array<JourneyMilestone & { id: string }> = rawItems.flatMap((item) => {
    const row = asRecord(item);
    const kind = asKind(row?.kind);
    if (!row || !kind || typeof row.id !== "string") {
      return [];
    }
    return [
      {
        id: row.id,
        kind,
        occurredOn: typeof row.occurredOn === "string" ? row.occurredOn : null,
        details: asRecord(row.details) ?? {},
        verification: asVerification(row.verificationState),
        exceptionNote: typeof row.exceptionNote === "string" ? row.exceptionNote : null,
      },
    ];
  });

  const flags = flagInconsistentDates(milestones);
  const state = deriveJourneyState(milestones);
  const internshipDays = timeToInternship(milestones);
  const placement = timeToPlacement(milestones);
  const known = milestones.filter((row) => row.occurredOn).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Private journey</h1>
        <p className="mt-2 text-sm text-text-muted">
          Milestones stay private. Saving an admission success never publishes a
          story or notifies a named mentor. Public consent is a separate step.
        </p>
        <p className="mt-2 text-sm text-text">
          Derived state: {JOURNEY_STATE_LABELS[state]}
        </p>
      </header>

      {flags.length > 0 ? (
        <section className="rounded-[var(--radius-card)] border border-critical bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">Date checks</h2>
          <ul className="mt-2 space-y-2 text-sm text-text">
            {flags.map((flag) => (
              <li key={flag.code}>{flag.message}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-text-muted">
            The saved dates are kept. A positive duration is not invented.
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-text">Timeline</h2>
        {milestones.length === 0 ? (
          <EmptyState
            title="No private milestones"
            message="Save a milestone when you have a date or an unknown outcome to record."
          />
        ) : (
          <ol className="mt-3 space-y-3">
            {milestones.map((row) => (
              <li
                key={row.id}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
              >
                <p className="text-sm font-medium text-text">{MILESTONE_LABELS[row.kind]}</p>
                <p className="mt-1 text-sm text-text-muted">
                  {row.occurredOn ?? NOT_PROVIDED}
                </p>
                <p className="mt-1 text-sm text-text">
                  {VERIFICATION_LABELS[row.verification]}
                  {row.verification === "self_reported" ? ` · ${SELF_REPORTED_LABEL}` : ""}
                </p>
                {row.kind === "internship" ? (
                  <p className="mt-1 text-sm text-text-muted">
                    {displayText(asText(row.details.details))}
                    {row.details.relevance
                      ? ` · ${displayText(asText(row.details.relevance)).replaceAll("_", " ")}`
                      : ""}
                  </p>
                ) : null}
                {row.kind === "first_job" ? (
                  <p className="mt-1 text-sm text-text-muted">
                    {[row.details.position, row.details.company, row.details.industry]
                      .filter((value) => typeof value === "string" && value)
                      .join(" · ") || NOT_PROVIDED}
                  </p>
                ) : null}
                {row.exceptionNote ? (
                  <p className="mt-1 text-sm text-text-muted">
                    Exception: {row.exceptionNote}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <MilestoneForm caseId={caseRow.id} />

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Private analytics</h2>
        <dl className="mt-3 grid gap-3 text-sm text-text">
          <div>
            <dt className="text-text-muted">Time to internship</dt>
            <dd>
              {internshipDays === null
                ? "Unknown. Missing or inverted dates stay out of the observed denominator."
                : `${internshipDays} days`}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Time to placement</dt>
            <dd>
              {placement.preGraduation
                ? "Pre-graduation offer. A positive placement duration is not invented."
                : placement.days === null
                  ? "Unknown. Missing dates stay out of the observed denominator."
                  : `${placement.days} days`}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Coverage</dt>
            <dd>
              Observed {known} of {MILESTONE_KINDS.length} kinds. Self-reported
              status is labelled {SELF_REPORTED_LABEL}.
            </dd>
          </div>
        </dl>
      </section>

      {canBecomeMentor(state) ? (
        <Link
          className="inline-flex h-12 items-center text-sm text-primary underline-offset-2 hover:underline"
          href="/mentor/profile"
        >
          Become a mentor
        </Link>
      ) : (
        <p className="text-sm text-text-muted">
          Mentor transition unlocks after a recorded graduation or first job.
        </p>
      )}

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Success-story preview</h2>
        <p className="mt-2 text-sm text-text-muted">
          Select which milestones may appear if you later publish. Publication,
          name, image and spotlight consents stay independent.
        </p>
        <div className="mt-4">
          <StorySubmitForm
            milestones={milestones.map((row) => ({
              id: row.id,
              label: `${MILESTONE_LABELS[row.kind]} · ${row.occurredOn ?? NOT_PROVIDED}`,
            }))}
          />
        </div>
      </section>

      <Link
        className="text-sm text-primary underline-offset-2 hover:underline"
        href={`/cases/${caseRow.id}/roadmap`}
      >
        Selected-target roadmap
      </Link>
    </div>
  );
}
