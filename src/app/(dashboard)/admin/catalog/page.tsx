import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { catalogEntityHref } from "@/app/(dashboard)/admin/_components/catalog/display";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { MICROCOPY } from "@/domain/microcopy";
import { loadAdminCommand } from "@/server/modules/admin/load";
import {
  listCatalogEntitiesCommand,
  listCatalogReviewDueCommand,
  type CatalogEntityListItem,
  type CatalogReviewDueItem,
} from "@/server/modules/catalog/commands";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catalog management",
};

interface PageProps {
  searchParams: Promise<{
    kind?: string;
    country?: string;
    state?: string;
    reviewDue?: string;
    offset?: string;
  }>;
}

const KINDS = [
  "university",
  "program",
  "accommodation",
  "scholarship",
  "taxonomy",
  "ingestion",
] as const;

export default async function AdminCatalogPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const kind = filters.kind ?? "university";
  const reviewDue = filters.reviewDue === "1";
  const offset = Number(filters.offset ?? "0") || 0;

  const result = reviewDue
    ? await loadAdminCommand((context) =>
        listCatalogReviewDueCommand(context, 20, offset),
      )
    : await loadAdminCommand((context) =>
        listCatalogEntitiesCommand(context, {
          kind,
          country: filters.country || null,
          state: filters.state || null,
          reviewDue: false,
          limit: 20,
          offset,
        }),
      );

  const rows: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    due: string | null;
    parentId?: string | null;
  }> = [];
  if (result.ok) {
    if (reviewDue) {
      for (const item of result.data.items as CatalogReviewDueItem[]) {
        rows.push({
          id: item.entity_id,
          name: `${item.entity_type} ${item.field_path}`,
          type: item.entity_type,
          status: "review due",
          due: item.next_review_at,
        });
      }
    } else {
      for (const item of result.data.items as CatalogEntityListItem[]) {
        rows.push({
          id: item.id,
          name: item.name,
          type: item.type,
          status: item.status,
          due: item.review_due,
          parentId: item.parent_id,
        });
      }
    }
  }

  return (
    <AdminChrome
      title="Catalog management"
      description="Draft, review and withdraw catalog rows. Unpublished taxonomy changes do not rewrite saved preferences. Visa guidance is ADM-09 and is not built in this slice."
    >
      <div className="flex flex-wrap gap-3">
        <Link
          className="text-primary underline-offset-2 hover:underline"
          href="/admin/universities/new"
        >
          New university
        </Link>
        <Link
          className="text-primary underline-offset-2 hover:underline"
          href="/admin/programs/new"
        >
          New program
        </Link>
        <Link
          className="text-primary underline-offset-2 hover:underline"
          href="/admin/scholarships/new"
        >
          New scholarship
        </Link>
        <Link
          className="text-primary underline-offset-2 hover:underline"
          href="/admin/ingestion/new"
        >
          Import source
        </Link>
      </div>

      <form
        className="grid gap-3 min-[600px]:grid-cols-4"
        method="get"
        action="/admin/catalog"
      >
        <label className="flex flex-col text-sm text-text">
          Selector
          <select
            name="kind"
            defaultValue={kind}
            className="mt-2 h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            {KINDS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
            <option value="visa">visa (ADM-09 not built)</option>
          </select>
        </label>
        <label className="flex flex-col text-sm text-text">
          Country
          <input
            name="country"
            defaultValue={filters.country ?? ""}
            className="mt-2 h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
            placeholder="GB"
          />
        </label>
        <label className="flex flex-col text-sm text-text">
          Status
          <input
            name="state"
            defaultValue={filters.state ?? ""}
            className="mt-2 h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
            placeholder="draft"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-text min-[600px]:self-end">
          <input type="checkbox" name="reviewDue" value="1" defaultChecked={reviewDue} />
          Review due
        </label>
        <button
          type="submit"
          className="h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-4 text-sm font-medium min-[600px]:col-span-4 min-[900px]:col-span-1"
        >
          Apply filters
        </button>
      </form>

      {kind === "visa" && !reviewDue ? (
        <EmptyState
          title="Visa editor is not in this slice"
          message="ADM-09 destination guidance is a later work package."
        />
      ) : !result.ok ? (
        result.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState message={MICROCOPY.retryableError} />
        )
      ) : rows.length === 0 ? (
        <EmptyState
          filtered
          title="No catalog rows"
          message="Create a university, program or scholarship, or submit an ingestion job."
        />
      ) : (
        <div className="space-y-4">
          <div className="hidden min-[900px]:grid min-[900px]:grid-cols-4 min-[900px]:gap-3 min-[900px]:px-4 min-[900px]:text-sm min-[900px]:text-text-muted">
            <p>Name</p>
            <p>Type</p>
            <p>Status</p>
            <p>Review due</p>
          </div>
          <ul className="grid gap-3">
            {rows.map((item) => (
              <li key={`${item.type}-${item.id}-${item.name}`}>
                <Link
                  href={catalogEntityHref(item.type, item.id, item.parentId)}
                  className="grid gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-4 min-[900px]:grid-cols-4 min-[900px]:items-center"
                >
                  <p className="text-sm text-text">{item.name}</p>
                  <p className="text-sm text-text-muted">{item.type}</p>
                  <ToneChip
                    tone={item.status === "published" ? "positive" : "neutral"}
                    label={item.status}
                  />
                  <p className="text-sm text-text-muted">
                    {item.due ? new Date(item.due).toLocaleDateString() : "Not provided"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <nav className="flex justify-between text-sm" aria-label="Pagination">
            {offset > 0 ? (
              <Link
                className="text-primary underline-offset-2 hover:underline"
                href={`/admin/catalog?kind=${kind}&country=${filters.country ?? ""}&state=${filters.state ?? ""}&reviewDue=${reviewDue ? "1" : ""}&offset=${Math.max(offset - 20, 0)}`}
              >
                Previous
              </Link>
            ) : (
              <span className="text-text-muted">Previous</span>
            )}
            {rows.length === 20 ? (
              <Link
                className="text-primary underline-offset-2 hover:underline"
                href={`/admin/catalog?kind=${kind}&country=${filters.country ?? ""}&state=${filters.state ?? ""}&reviewDue=${reviewDue ? "1" : ""}&offset=${offset + 20}`}
              >
                Next
              </Link>
            ) : (
              <span className="text-text-muted">Next</span>
            )}
          </nav>
        </div>
      )}
    </AdminChrome>
  );
}
