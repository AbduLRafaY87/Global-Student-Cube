import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { CatalogPublishForm } from "@/app/(dashboard)/admin/_components/catalog/CatalogPublishForm";
import { asText } from "@/app/(dashboard)/admin/_components/catalog/display";
import { ScholarshipEditor } from "@/app/(dashboard)/admin/_components/catalog/ScholarshipEditor";
import { SourceFactForm } from "@/app/(dashboard)/admin/_components/catalog/SourceFactForm";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { MICROCOPY } from "@/domain/microcopy";
import { isUuid } from "@/server/modules/admin/http";
import { loadAdminCommand } from "@/server/modules/admin/load";
import { getCatalogScholarshipCommand } from "@/server/modules/catalog/commands";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scholarship editor",
};

interface PageProps {
  params: Promise<{ scholarshipId: string }>;
}

interface ScholarshipPayload {
  scholarship?: Record<string, unknown> | null;
}

export default async function AdminScholarshipEditorPage({ params }: PageProps) {
  const { scholarshipId } = await params;
  const result = isUuid(scholarshipId)
    ? await loadAdminCommand((context) => getCatalogScholarshipCommand(context, scholarshipId))
    : { ok: false as const, forbidden: false };
  const payload = result.ok ? (result.data as ScholarshipPayload | null) : null;
  const scholarship = payload?.scholarship ?? null;

  return (
    <AdminChrome
      title="Scholarship URL and metadata"
      description="Publication needs verified minimal metadata or an explicit Unknown. Closed status keeps historic references."
    >
      {!result.ok ? (
        result.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState message={MICROCOPY.retryableError} />
        )
      ) : !scholarship ? (
        <EmptyState title="Scholarship not found" message="That draft is not available." />
      ) : (
        <div className="space-y-6">
          <ToneChip
            tone={asText(scholarship.publication_state) === "published" ? "positive" : "neutral"}
            label={asText(scholarship.publication_state)}
          />
          <ScholarshipEditor
            scholarshipId={scholarshipId}
            initial={{
              name: asText(scholarship.name),
              providerName: asText(scholarship.provider_name),
              officialUrl: asText(scholarship.official_url),
              providerType: asText(scholarship.provider_type),
              countryCodes: Array.isArray(scholarship.country_codes)
                ? scholarship.country_codes.filter((value): value is string => typeof value === "string").join(", ")
                : "",
              levels: Array.isArray(scholarship.levels)
                ? scholarship.levels.filter((value): value is string => typeof value === "string").join(", ")
                : "",
              fieldIds: Array.isArray(scholarship.field_ids)
                ? scholarship.field_ids.filter((value): value is string => typeof value === "string").join(", ")
                : "",
              availability: asText(scholarship.availability),
              deadlinePrecision: asText(scholarship.deadline_precision),
              deadlineDate: asText(scholarship.deadline_date),
              deadlineMonth: asText(scholarship.deadline_month),
            }}
          />
          <SourceFactForm entityType="scholarship" entityId={scholarshipId} />
          <CatalogPublishForm
            entityType="scholarship"
            entityId={scholarshipId}
            currentState={asText(scholarship.publication_state) || "draft"}
          />
        </div>
      )}
    </AdminChrome>
  );
}
