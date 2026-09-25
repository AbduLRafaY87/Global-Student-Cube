import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { CatalogPublishForm } from "@/app/(dashboard)/admin/_components/catalog/CatalogPublishForm";
import { asText } from "@/app/(dashboard)/admin/_components/catalog/display";
import { GuidanceEditor } from "@/app/(dashboard)/admin/_components/catalog/GuidanceEditor";
import { SourceFactForm } from "@/app/(dashboard)/admin/_components/catalog/SourceFactForm";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { MICROCOPY } from "@/domain/microcopy";
import { isUuid } from "@/server/modules/admin/http";
import { loadAdminCommand } from "@/server/modules/admin/load";
import {
  getCountryGuidanceCommand,
  traceSourceRevisionCommand,
} from "@/server/modules/catalog/commands";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Destination guidance editor",
};

interface PageProps {
  params: Promise<{ visaRuleId: string }>;
}

interface GuidancePayload {
  guidance?: Record<string, unknown> | null;
}

function asList(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").join(", ");
  }
  return "";
}

function documentKeys(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object" && "key" in item) {
        const key = (item as { key?: unknown }).key;
        return typeof key === "string" ? key : "";
      }
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

export default async function AdminVisaEditorPage({ params }: PageProps) {
  const { visaRuleId } = await params;
  const result = isUuid(visaRuleId)
    ? await loadAdminCommand((context) => getCountryGuidanceCommand(context, visaRuleId))
    : { ok: false as const, forbidden: false };
  const payload = result.ok ? (result.data as GuidancePayload | null) : null;
  const guidance = payload?.guidance ?? null;
  const trace = isUuid(visaRuleId)
    ? await loadAdminCommand((context) =>
        traceSourceRevisionCommand(context, "country_guidance", visaRuleId),
      )
    : { ok: false as const, forbidden: false };
  const revisions =
    trace.ok && Array.isArray(trace.data.revisions)
      ? (trace.data.revisions as Array<{
          source_fact_id: string;
          field_path: string;
          canonical_url: string;
          retrieved_at: string;
          content_hash: string;
          verified_at: string | null;
        }>)
      : [];

  return (
    <AdminChrome
      title="Visa and destination guidance"
      description="Publish updates JRN-02. Expired sources are flagged. Unknown is not historical certainty."
    >
      {!result.ok ? (
        result.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState message={MICROCOPY.retryableError} />
        )
      ) : !guidance ? (
        <EmptyState title="Guidance not found" message="That draft is not available." />
      ) : (
        <div className="space-y-6">
          <ToneChip
            tone={asText(guidance.publication_state) === "published" ? "positive" : "neutral"}
            label={asText(guidance.publication_state)}
          />
          <GuidanceEditor
            guidanceId={visaRuleId}
            initial={{
              country: asText(guidance.country),
              studyLevel: asText(guidance.study_level),
              visaCategory: asText(guidance.visa_category),
              nationalityApplicability: asList(guidance.nationality_applicability),
              officialUrl: asText(guidance.official_url),
              officialAuthority: asText(guidance.official_authority),
              sourceDate: asText(guidance.source_date),
              applicationFeeAmount: asText(guidance.application_fee_amount),
              applicationFeeCurrency: asText(guidance.application_fee_currency),
              visaFeeAmount: asText(guidance.visa_fee_amount),
              visaFeeCurrency: asText(guidance.visa_fee_currency),
              paymentNotes: asText(guidance.payment_notes),
              processingMin: asText(guidance.processing_min),
              processingMax: asText(guidance.processing_max),
              processingUnit: asText(guidance.processing_unit),
              documents: documentKeys(guidance.documents),
              countryRules: asText(guidance.country_rules),
              workHoursValue: asText(guidance.work_hours_value),
              workHoursPeriod: asText(guidance.work_hours_period),
              workHoursConditions: asText(guidance.work_hours_conditions),
              workHoursSource: asText(guidance.work_hours_source),
              workHoursSourceDate: asText(guidance.work_hours_source_date),
              faq: Array.isArray(guidance.faq)
                ? guidance.faq
                    .map((item) =>
                      item && typeof item === "object" && "answer" in item
                        ? String((item as { answer?: unknown }).answer ?? "")
                        : "",
                    )
                    .filter(Boolean)
                    .join(" ")
                : "",
              reapplicationNotes: asText(guidance.reapplication_notes),
              studentAdvice: asText(guidance.student_advice),
              counselorNotes: asText(guidance.counselor_notes),
              nextReviewAt: asText(guidance.next_review_at).slice(0, 10),
            }}
          />
          <SourceFactForm
            entityType="country_guidance"
            entityId={visaRuleId}
            defaultFieldPath="official_url"
          />
          <CatalogPublishForm
            entityType="country_guidance"
            entityId={visaRuleId}
            currentState={asText(guidance.publication_state) || "draft"}
          />
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text">Source revisions</h2>
            {revisions.length === 0 ? (
              <p className="text-sm text-text-muted">
                No source revision is attached. Publish is blocked until provenance exists.
              </p>
            ) : (
              <ul className="grid gap-3">
                {revisions.map((row) => (
                  <li
                    key={row.source_fact_id}
                    className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm"
                  >
                    <p className="text-text">
                      {row.field_path} · {row.canonical_url}
                    </p>
                    <p className="mt-1 text-text-muted">
                      Retrieved {new Date(row.retrieved_at).toLocaleDateString()} · hash{" "}
                      {row.content_hash} · fact {row.source_fact_id}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AdminChrome>
  );
}
