import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { ReviewForm } from "@/app/(dashboard)/admin/_components/catalog/ReviewForm";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { MICROCOPY } from "@/domain/microcopy";
import { isUuid } from "@/server/modules/admin/http";
import { loadAdminCommand } from "@/server/modules/admin/load";
import { getCatalogIngestionJobCommand } from "@/server/modules/catalog/commands";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Extraction review",
};

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function AdminIngestionReviewPage({ params }: PageProps) {
  const { jobId } = await params;
  const result = isUuid(jobId)
    ? await loadAdminCommand((context) => getCatalogIngestionJobCommand(context, jobId))
    : { ok: false as const, forbidden: false };

  return (
    <AdminChrome
      title="Extracted data review"
      description="Accept or reject each field. Reviewer and next-review date are recorded. Imports and extractions never auto-publish."
    >
      {!result.ok ? (
        result.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState message={MICROCOPY.retryableError} />
        )
      ) : !result.data?.job ? (
        <EmptyState title="Job not found" message="That extraction is not available." />
      ) : (
        <div className="space-y-6">
          <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <div className="flex flex-wrap gap-2">
              <ToneChip tone="neutral" label={result.data.job.status} />
              <ToneChip tone="neutral" label={result.data.job.source_type} />
            </div>
            <p className="mt-3 text-sm text-text">{result.data.job.canonical_url}</p>
            <p className="mt-1 text-sm text-text-muted">
              Retrieved {result.data.job.retrieved_at ?? "Not provided"} · hash{" "}
              {result.data.job.content_hash ?? "Not provided"}
            </p>
            <p className="mt-2 text-sm text-text">
              Excerpt: {result.data.job.excerpt ?? "Not provided"}
            </p>
          </section>
          <ReviewForm
            jobId={result.data.job.id}
            fields={result.data.fields}
            entityType={result.data.job.entity_type}
            entityId={result.data.job.entity_id}
          />
        </div>
      )}
    </AdminChrome>
  );
}
