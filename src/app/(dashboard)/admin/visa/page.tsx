import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { catalogEntityHref } from "@/app/(dashboard)/admin/_components/catalog/display";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { MICROCOPY } from "@/domain/microcopy";
import { loadAdminCommand } from "@/server/modules/admin/load";
import {
  listCatalogEntitiesCommand,
  listQuarterlyReviewRemindersCommand,
  type CatalogEntityListItem,
} from "@/server/modules/catalog/commands";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visa and destination guidance",
};

export default async function AdminVisaListPage() {
  const result = await loadAdminCommand((context) =>
    listCatalogEntitiesCommand(context, {
      kind: "country_guidance",
      country: null,
      state: null,
      reviewDue: false,
      limit: 20,
      offset: 0,
    }),
  );
  const reminders = await loadAdminCommand((context) =>
    listQuarterlyReviewRemindersCommand(context, 20, 0),
  );
  const rows = result.ok ? (result.data.items as CatalogEntityListItem[]) : [];
  const reminderItems = reminders.ok && Array.isArray(reminders.data.items)
    ? (reminders.data.items as Array<{
        source_fact_id: string;
        entity_type: string;
        entity_id: string;
        field_path: string;
        next_review_at: string;
        overdue: boolean;
      }>)
    : [];

  return (
    <AdminChrome
      title="Visa and destination guidance"
      description="Editorial country rules with sources and review dates. Published updates appear on JRN-02. Imports never auto-publish."
    >
      <Link
        className="text-primary underline-offset-2 hover:underline"
        href="/admin/visa/new"
      >
        New destination guidance
      </Link>
      {!result.ok ? (
        result.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState message={MICROCOPY.retryableError} />
        )
      ) : rows.length === 0 ? (
        <EmptyState
          title="No destination guidance"
          message="Create a country, level and visa category draft. Do not invent official fees."
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((item) => (
            <li key={item.id}>
              <Link
                href={catalogEntityHref(item.type, item.id)}
                className="grid gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-4 min-[900px]:grid-cols-3"
              >
                <p className="text-sm text-text">{item.name}</p>
                <ToneChip
                  tone={item.status === "published" ? "positive" : "neutral"}
                  label={item.status}
                />
                <p className="text-sm text-text-muted">
                  {item.review_due
                    ? new Date(item.review_due).toLocaleDateString()
                    : "Not provided"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Quarterly review reminders</h2>
        {reminderItems.length === 0 ? (
          <p className="text-sm text-text-muted">No reviews due in the next 14 days.</p>
        ) : (
          <ul className="grid gap-3">
            {reminderItems.map((item) => (
              <li
                key={item.source_fact_id}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm"
              >
                <Link
                  className="text-primary underline-offset-2 hover:underline"
                  href={catalogEntityHref(item.entity_type, item.entity_id)}
                >
                  {item.entity_type} · {item.field_path}
                </Link>
                <p className="mt-1 text-text-muted">
                  {item.overdue ? "Overdue" : "Reminder"} ·{" "}
                  {new Date(item.next_review_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminChrome>
  );
}
