import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { CatalogPublishForm } from "@/app/(dashboard)/admin/_components/catalog/CatalogPublishForm";
import { asJsonText, asText } from "@/app/(dashboard)/admin/_components/catalog/display";
import { ProgramEditor } from "@/app/(dashboard)/admin/_components/catalog/ProgramEditor";
import { ProgramPricingForms } from "@/app/(dashboard)/admin/_components/catalog/ProgramPricingForms";
import { SourceFactForm } from "@/app/(dashboard)/admin/_components/catalog/SourceFactForm";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { MICROCOPY } from "@/domain/microcopy";
import { isUuid } from "@/server/modules/admin/http";
import { loadAdminCommand } from "@/server/modules/admin/load";
import { getCatalogProgramCommand } from "@/server/modules/catalog/commands";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Program editor",
};

interface PageProps {
  params: Promise<{ programId: string }>;
}

interface ProgramPayload {
  program?: Record<string, unknown> | null;
  costs?: Array<Record<string, unknown>>;
  intakes?: Array<Record<string, unknown>>;
  actionLink?: Record<string, unknown> | null;
}

export default async function AdminProgramEditorPage({ params }: PageProps) {
  const { programId } = await params;
  const result = isUuid(programId)
    ? await loadAdminCommand((context) => getCatalogProgramCommand(context, programId))
    : { ok: false as const, forbidden: false };
  const payload = result.ok ? (result.data as ProgramPayload | null) : null;
  const program = payload?.program ?? null;

  return (
    <AdminChrome
      title="Program and pricing editor"
      description="Fee annualization needs an explicit basis. Application URLs stay gated. A month-only deadline is never given a last day."
    >
      {!result.ok ? (
        result.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState message={MICROCOPY.retryableError} />
        )
      ) : !program ? (
        <EmptyState title="Program not found" message="That draft is not available." />
      ) : (
        <div className="space-y-6">
          <ToneChip
            tone={asText(program.publication_state) === "published" ? "positive" : "neutral"}
            label={asText(program.publication_state)}
          />
          <ProgramEditor
            programId={programId}
            initial={{
              universityId: asText(program.university_id),
              name: asText(program.name),
              level: asText(program.level),
              fieldId: asText(program.field_id),
              durationValue: asText(program.duration_value),
              durationUnit: asText(program.duration_unit),
              studyModes: Array.isArray(program.study_modes)
                ? program.study_modes.filter((value): value is string => typeof value === "string").join(", ")
                : "on_campus",
              generalUrl: asText(program.general_url),
              internationalRatio: asText(program.international_ratio),
            }}
          />
          <SourceFactForm entityType="program" entityId={programId} />
          {(payload?.costs ?? []).length > 0 ? (
            <ul className="grid gap-3">
              {(payload?.costs ?? []).map((cost) => (
                <li
                  key={asText(cost.id)}
                  className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text"
                >
                  {asText(cost.academic_year)} · {asText(cost.fee_basis)} · {asText(cost.amount)}{" "}
                  {asText(cost.currency)}
                </li>
              ))}
            </ul>
          ) : null}
          {(payload?.intakes ?? []).length > 0 ? (
            <ul className="grid gap-3">
              {(payload?.intakes ?? []).map((intake) => (
                <li
                  key={asText(intake.id)}
                  className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text"
                >
                  {asText(intake.intake_year)} · {asText(intake.deadline_precision)} ·{" "}
                  {asText(intake.deadline_date) || asText(intake.deadline_month) || "Not provided"}
                </li>
              ))}
            </ul>
          ) : null}
          {payload?.actionLink ? (
            <p className="text-sm text-text-muted">
              Gated application URL is stored and excluded from public payloads.{" "}
              {asJsonText(payload.actionLink.application_url)}
            </p>
          ) : null}
          <ProgramPricingForms programId={programId} />
          <CatalogPublishForm
            entityType="program"
            entityId={programId}
            currentState={asText(program.publication_state) || "draft"}
          />
          <Link
            className="text-primary underline-offset-2 hover:underline"
            href={`/admin/programs/${programId}/requirements`}
          >
            Edit requirements
          </Link>
        </div>
      )}
    </AdminChrome>
  );
}
