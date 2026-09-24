import type { StaffPermission } from "./permissions";
import { hasLivePermission } from "./permissions";

export type AdminQueueId =
  | "professional_review"
  | "guardian_review"
  | "escalations"
  | "recent_audit"
  | "ingestion_review"
  | "catalog_review_due";

export interface AdminQueueMetric {
  id: AdminQueueId;
  label: string;
  count: number;
  href: string;
  permission: StaffPermission;
}

export type AdminOverviewQueue = Omit<AdminQueueMetric, "permission">;

const QUEUE_DEFS: readonly AdminQueueMetric[] = [
  {
    id: "professional_review",
    label: "Professional reviews",
    count: 0,
    href: "/admin/approvals?kind=professional",
    permission: "verification",
  },
  {
    id: "guardian_review",
    label: "Guardian-link reviews",
    count: 0,
    href: "/admin/approvals?kind=guardian_link",
    permission: "verification",
  },
  {
    id: "escalations",
    label: "Supervisor escalations",
    count: 0,
    href: "/admin/approvals?escalated=1",
    permission: "supervisor",
  },
  {
    id: "recent_audit",
    label: "Recent audited actions",
    count: 0,
    href: "/admin/audit",
    permission: "operations",
  },
  {
    id: "ingestion_review",
    label: "Catalog extractions to review",
    count: 0,
    href: "/admin/catalog?kind=ingestion",
    permission: "catalog_editorial",
  },
  {
    id: "catalog_review_due",
    label: "Quarterly catalog review due",
    count: 0,
    href: "/admin/catalog?reviewDue=1",
    permission: "catalog_editorial",
  },
];

export function visibleOverviewQueues(
  granted: readonly string[],
  counts: Partial<Record<AdminQueueId, number>>,
): AdminOverviewQueue[] {
  return QUEUE_DEFS.filter((queue) =>
    hasLivePermission(granted, queue.permission),
  ).map((queue) => ({
    id: queue.id,
    label: queue.label,
    href: queue.href,
    count: counts[queue.id] ?? 0,
  }));
}
