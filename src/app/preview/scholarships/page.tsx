import { PublicChrome } from "@/components/public/PublicChrome";
import { ScholarshipCard } from "@/components/public/ScholarshipCard";
import {
  GUEST_PREVIEW_CAP,
  NO_SUBMIT_COPY,
  guestPreviewRows,
  toScholarshipRecord,
} from "@/domain/scholarships/scholarships";
import { fetchPublishedScholarships } from "@/server/modules/catalog/public";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scholarship preview",
  description:
    "Register to view the full scholarship directory. Applications happen on providers’ websites, not inside Global Student Cube.",
};

interface PageProps {
  searchParams: Promise<{ country?: string; level?: string }>;
}

export default async function ScholarshipPreviewPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const country = (filters.country ?? "").trim().toUpperCase();
  const level = (filters.level ?? "").trim();
  const slice = guestPreviewRows(
    (await fetchPublishedScholarships()).map(toScholarshipRecord),
    { country, level },
  );

  return (
    <PublicChrome>
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-text">
        <GraduationCap className="size-6" aria-hidden />
        Scholarship preview
      </h1>
      <p className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text">
        Register to view the full scholarship directory. Applications happen on
        providers’ websites. {NO_SUBMIT_COPY}
      </p>
      <form method="get" className="grid gap-3 min-[768px]:grid-cols-3">
        <label className="text-sm text-text">
          Country
          <input
            name="country"
            defaultValue={country}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <label className="text-sm text-text">
          Level
          <select
            name="level"
            defaultValue={level}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">Any</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="masters">Masters</option>
            <option value="phd">PhD</option>
            <option value="certificate">Certificate</option>
          </select>
        </label>
        <button
          type="submit"
          className="h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-4 text-sm font-medium min-[768px]:self-end"
        >
          Apply filters
        </button>
      </form>
      {slice.length === 0 ? (
        <p className="text-sm text-text-muted">
          No curated scholarship rows are published. Register to be notified when
          the directory opens. There are no blurred placeholder rows.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Showing {slice.length} of up to {GUEST_PREVIEW_CAP} preview rows.
          </p>
          <ul className="grid gap-3">
            {slice.map((row) => (
              <ScholarshipCard
                key={row.id}
                row={row}
                detailsHref={`/scholarships/${row.id}`}
                detailsLabel="View scholarship"
              />
            ))}
          </ul>
        </div>
      )}
      <Link
        className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
        href="/register"
      >
        Unlock full directory
      </Link>
    </PublicChrome>
  );
}
