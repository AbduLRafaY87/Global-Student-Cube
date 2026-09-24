import {
  availabilityLabel,
  lastVerifiedLabel,
  scholarshipDeadlineLabel,
  type ScholarshipRecord,
} from "@/domain/scholarships/scholarships";
import { NOT_PROVIDED } from "@/domain/catalog/display";
import Link from "next/link";

interface ScholarshipCardProps {
  row: ScholarshipRecord;
  detailsHref: string;
  detailsLabel?: string;
}

export function ScholarshipCard({
  row,
  detailsHref,
  detailsLabel = "View details",
}: ScholarshipCardProps) {
  const status = availabilityLabel(row.availability, {
    precision: row.deadlinePrecision,
    date: row.deadlineDate,
  });

  return (
    <li className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <p className="font-medium text-text">{row.name}</p>
      <p className="text-sm text-text-muted">{row.providerName}</p>
      <p className="mt-2 text-sm text-text">
        Status: <span className={status === "Closed" ? "font-medium text-text" : ""}>{status}</span>
      </p>
      <p className="text-sm text-text">
        Eligibility: {row.eligibilityExcerpt ?? NOT_PROVIDED}
      </p>
      <p className="text-sm text-text">Deadline: {scholarshipDeadlineLabel(row)}</p>
      <p className="text-sm text-text-muted">Last verified: {lastVerifiedLabel(row.verifiedAt)}</p>
      <Link
        className="mt-3 inline-block text-sm text-primary underline-offset-2 hover:underline"
        href={detailsHref}
      >
        {detailsLabel}
      </Link>
    </li>
  );
}
