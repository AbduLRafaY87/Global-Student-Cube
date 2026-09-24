import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { CatalogPublishForm } from "@/app/(dashboard)/admin/_components/catalog/CatalogPublishForm";
import { asJsonText, asText } from "@/app/(dashboard)/admin/_components/catalog/display";
import { RequirementsEditor } from "@/app/(dashboard)/admin/_components/catalog/RequirementsEditor";
import { SourceFactForm } from "@/app/(dashboard)/admin/_components/catalog/SourceFactForm";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { MICROCOPY } from "@/domain/microcopy";
import { isUuid } from "@/server/modules/admin/http";
import { loadAdminCommand } from "@/server/modules/admin/load";
import { getCatalogProgramCommand } from "@/server/modules/catalog/commands";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entry requirements",
};

interface PageProps {
  params: Promise<{ programId: string }>;
}

interface ProgramPayload {
  program?: Record<string, unknown> | null;
  criteria?: Array<Record<string, unknown>>;
}

export default async function AdminProgramRequirementsPage({ params }: PageProps) {
  const { programId } = await params;
  const result = isUuid(programId)
    ? await loadAdminCommand((context) => getCatalogProgramCommand(context, programId))
    : { ok: false as const, forbidden: false };
  const payload = result.ok ? (result.data as ProgramPayload | null) : null;
  const program = payload?.program ?? null;

  return (
    <AdminChrome
      title="Entry requirement rules"
      description="Publishing versions criteria and leaves recorded self-check answers unchanged. Hard requirements override a high weighted score."
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
          <p className="text-sm text-text">
            {asText(program.name)} · {asText(program.publication_state)}
          </p>
          {(payload?.criteria ?? []).length === 0 ? (
            <p className="text-sm text-text-muted">No criteria yet.</p>
          ) : (
            <ul className="grid gap-3">
              {(payload?.criteria ?? []).map((row) => (
                <li
                  key={`${asText(row.criterion_key)}-${asText(row.revision)}`}
                  className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
                >
                  <p className="text-sm font-medium text-text">
                    {asText(row.criterion_key)} · revision {asText(row.revision)}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    {asText(row.kind)} · {row.mandatory === true ? "mandatory" : "weighted"} · weight{" "}
                    {row.weight == null ? "equal-weight fallback" : asText(row.weight)}
                  </p>
                  <p className="mt-2 text-sm text-text">{asJsonText(row.requirement)}</p>
                </li>
              ))}
            </ul>
          )}
          <RequirementsEditor programId={programId} />
          <SourceFactForm
            entityType="program"
            entityId={programId}
            defaultFieldPath="entry_criteria"
          />
          <CatalogPublishForm
            entityType="program"
            entityId={programId}
            currentState={asText(program.publication_state) || "draft"}
          />
        </div>
      )}
    </AdminChrome>
  );
}
