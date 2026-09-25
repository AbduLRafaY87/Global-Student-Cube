import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { AccommodationForm } from "@/app/(dashboard)/admin/_components/catalog/AccommodationForm";
import { CatalogPublishForm } from "@/app/(dashboard)/admin/_components/catalog/CatalogPublishForm";
import { asText } from "@/app/(dashboard)/admin/_components/catalog/display";
import { SourceFactForm } from "@/app/(dashboard)/admin/_components/catalog/SourceFactForm";
import { UniversityEditor } from "@/app/(dashboard)/admin/_components/catalog/UniversityEditor";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { MICROCOPY } from "@/domain/microcopy";
import { isUuid } from "@/server/modules/admin/http";
import { loadAdminCommand } from "@/server/modules/admin/load";
import { getCatalogUniversityCommand } from "@/server/modules/catalog/commands";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "University editor",
};

interface PageProps {
  params: Promise<{ universityId: string }>;
}

interface UniversityPayload {
  university?: Record<string, unknown> | null;
  accommodations?: Array<Record<string, unknown>>;
  rankings?: Array<Record<string, unknown>>;
}

export default async function AdminUniversityEditorPage({ params }: PageProps) {
  const { universityId } = await params;
  const result = isUuid(universityId)
    ? await loadAdminCommand((context) => getCatalogUniversityCommand(context, universityId))
    : { ok: false as const, forbidden: false };

  const payload = result.ok ? (result.data as UniversityPayload | null) : null;
  const university = payload?.university ?? null;

  return (
    <AdminChrome
      title="University and accommodation editor"
      description="Draft, source and publish a university. Nightly prices never fill monthly costs. Community proximity is not a matching score."
    >
      {!result.ok ? (
        result.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState message={MICROCOPY.retryableError} />
        )
      ) : !university ? (
        <EmptyState title="University not found" message="That draft is not available." />
      ) : (
        <div className="space-y-6">
          <ToneChip
            tone={asText(university.publication_state) === "published" ? "positive" : "neutral"}
            label={asText(university.publication_state)}
          />
          <UniversityEditor
            universityId={universityId}
            initial={{
              name: asText(university.name),
              slug: asText(university.slug),
              country: asText(university.country),
              city: asText(university.city),
              type: asText(university.type),
              websiteUrl: asText(university.website_url),
              aliases: Array.isArray(university.aliases)
                ? university.aliases.filter((value): value is string => typeof value === "string").join(", ")
                : "",
            }}
          />
          <SourceFactForm entityType="university" entityId={universityId} />
          <CatalogPublishForm
            entityType="university"
            entityId={universityId}
            currentState={asText(university.publication_state) || "draft"}
          />
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text">Accommodation</h2>
            {(payload?.accommodations ?? []).length === 0 ? (
              <p className="text-sm text-text-muted">No accommodation rows yet.</p>
            ) : (
              <ul className="grid gap-3">
                {(payload?.accommodations ?? []).map((row) => (
                  <li
                    key={asText(row.id)}
                    className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
                  >
                    <p className="text-sm text-text">{asText(row.name)}</p>
                    <p className="mt-1 text-sm text-text-muted">
                      {asText(row.type)} · {asText(row.basis)} ·{" "}
                      {row.amount == null ? "Not provided" : `${asText(row.amount)} ${asText(row.currency)}`}
                      {row.meal_included_in_rent === true ? " · meals included in rent" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <AccommodationForm universityId={universityId} />
          </section>
          {(payload?.rankings ?? []).length > 0 ? (
            <section>
              <h2 className="text-lg font-semibold text-text">Rankings</h2>
              <p className="mt-1 text-sm text-text-muted">
                Confirm you have the right to use ranking data before publishing.
              </p>
              <ul className="mt-3 grid gap-3">
                {(payload?.rankings ?? []).map((row) => (
                  <li
                    key={asText(row.id)}
                    className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text"
                  >
                    {asText(row.publisher)} {asText(row.edition_year)} · {asText(row.subject)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <Link
            className="text-primary underline-offset-2 hover:underline"
            href={`/admin/programs/new?universityId=${universityId}`}
          >
            Manage programs
          </Link>
        </div>
      )}
    </AdminChrome>
  );
}
