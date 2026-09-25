import { VisaGuidanceActions } from "@/components/catalog/VisaGuidanceActions";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { displayMoney, displayText, NOT_PROVIDED } from "@/domain/catalog/display";
import {
  NO_VISA_GUARANTEE,
  VISA_CATEGORY_LABELS,
  VISA_DOCUMENT_LABELS,
  type VisaCategory,
  type VisaDocument,
} from "@/domain/catalog/guidance";
import { isUuid } from "@/server/modules/admin/http";
import { loadCaseVisaGuidance } from "@/server/modules/catalog/load";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Destination visa and work guidance",
};

interface PageProps {
  params: Promise<{ caseId: string }>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asVisaDocument(value: unknown): VisaDocument | null {
  return typeof value === "string" && value in VISA_DOCUMENT_LABELS
    ? (value as VisaDocument)
    : null;
}

export default async function CaseVisaPage({ params }: PageProps) {
  const { caseId } = await params;
  if (!isUuid(caseId)) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <EmptyState title="Case unavailable" message="That case is not available." />
      </div>
    );
  }

  const result = await loadCaseVisaGuidance(caseId);
  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }

  const data = result.data;
  const unlocked = data.unlocked === true;
  const guidance = asRecord(data.guidance);
  const checklist = Array.isArray(data.checklist) ? data.checklist : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Destination visa and work guidance</h1>
        <p className="mt-2 text-sm text-text-muted">{NO_VISA_GUARANTEE}</p>
      </header>

      {!unlocked ? (
        <EmptyState
          title="Guidance is locked"
          message={
            asText(data.lockReason) ||
            "Visa guidance unlocks after completed counseling and an explicit target selection."
          }
        />
      ) : data.noMatchedGuidance === true ? (
        <EmptyState
          title="No matched guidance"
          message="There is no published destination guidance for this nationality and study level."
        />
      ) : !guidance ? (
        <EmptyState
          title="No matched guidance"
          message="There is no published destination guidance for this nationality and study level."
        />
      ) : (
        <div className="space-y-6">
          {data.outdated === true ? (
            <p className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text">
              This guidance is past its review date. Confirm it with the official authority.
            </p>
          ) : null}
          <dl className="grid gap-3 text-sm text-text">
            <div>
              <dt className="text-text-muted">Destination</dt>
              <dd>{displayText(asText(guidance.country))}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Study level</dt>
              <dd>{displayText(asText(guidance.studyLevel))}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Visa type</dt>
              <dd>
                {guidance.visaCategory && String(guidance.visaCategory) in VISA_CATEGORY_LABELS
                  ? VISA_CATEGORY_LABELS[guidance.visaCategory as VisaCategory]
                  : NOT_PROVIDED}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Official authority</dt>
              <dd>{displayText(asText(guidance.officialAuthority))}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Source date</dt>
              <dd>{displayText(asText(guidance.sourceDate))}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Application fee</dt>
              <dd>
                {displayMoney(
                  typeof guidance.applicationFeeAmount === "number"
                    ? guidance.applicationFeeAmount
                    : Number(guidance.applicationFeeAmount) || null,
                  asText(guidance.applicationFeeCurrency) || null,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Visa fee</dt>
              <dd>
                {displayMoney(
                  typeof guidance.visaFeeAmount === "number"
                    ? guidance.visaFeeAmount
                    : Number(guidance.visaFeeAmount) || null,
                  asText(guidance.visaFeeCurrency) || null,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Processing range</dt>
              <dd>
                {guidance.processingMin == null && guidance.processingMax == null
                  ? NOT_PROVIDED
                  : `${displayText(asText(guidance.processingMin))}–${displayText(asText(guidance.processingMax))} ${displayText(asText(guidance.processingUnit))}`}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Work rules</dt>
              <dd>
                {guidance.workHoursValue == null
                  ? NOT_PROVIDED
                  : `${displayText(asText(guidance.workHoursValue))} ${displayText(asText(guidance.workHoursPeriod))}`}
              </dd>
              <p className="mt-1 text-text-muted">
                {displayText(asText(guidance.workHoursConditions))}
              </p>
              <p className="mt-1 text-text-muted">
                Source {displayText(asText(guidance.workHoursSource))} ·{" "}
                {displayText(asText(guidance.workHoursSourceDate))}
              </p>
            </div>
          </dl>
          {guidance.officialUrl ? (
            <a
              className="inline-flex items-center gap-2 text-sm text-primary underline-offset-2 hover:underline"
              href={asText(guidance.officialUrl)}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4" aria-hidden />
              Official authority
            </a>
          ) : null}
          {guidance.studentAdvice ? (
            <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
              <h2 className="text-lg font-semibold text-text">Counselor advisory</h2>
              <p className="mt-2 text-sm text-text-muted">
                Separately labelled advice. This is not an official requirement.
              </p>
              <p className="mt-2 text-sm text-text">{asText(guidance.studentAdvice)}</p>
            </section>
          ) : null}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text">Documents</h2>
            {checklist.length === 0 ? (
              <p className="text-sm text-text-muted">{NOT_PROVIDED}</p>
            ) : (
              <ul className="grid gap-4">
                {checklist.map((item) => {
                  const row = asRecord(item);
                  const key = asVisaDocument(row?.document_key);
                  if (!row || !key) {
                    return null;
                  }
                  return (
                    <li
                      key={key}
                      className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
                    >
                      <p className="text-sm font-medium text-text">{VISA_DOCUMENT_LABELS[key]}</p>
                      <VisaGuidanceActions
                        caseId={caseId}
                        country={asText(guidance.country)}
                        documentKey={key}
                        status={asText(row.status) || "not_started"}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <Link
            className="text-sm text-primary underline-offset-2 hover:underline"
            href="/messages"
          >
            Ask counselor
          </Link>
        </div>
      )}
    </div>
  );
}
