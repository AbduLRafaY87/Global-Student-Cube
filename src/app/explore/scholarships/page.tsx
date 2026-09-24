import { PublicChrome } from "@/components/public/PublicChrome";
import { QueryPagination } from "@/components/public/QueryPagination";
import { ScholarshipCard } from "@/components/public/ScholarshipCard";
import { EmptyState } from "@/components/ui/States";
import { CATALOG_FIELD_OPTIONS } from "@/app/(dashboard)/admin/_components/catalog/display";
import {
  SCHOLARSHIP_AVAILABILITIES,
  SCHOLARSHIP_TYPES,
  filterScholarships,
  paginateScholarships,
  scholarshipTypeLabel,
  toScholarshipRecord,
} from "@/domain/scholarships/scholarships";
import { createClient } from "@/lib/supabase/server";
import { fetchPublishedScholarships } from "@/server/modules/catalog/public";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scholarship directory",
  description:
    "Published scholarships with sourced eligibility, deadline precision and last verified dates. Applications stay on provider websites.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ScholarshipDirectoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const preview = new URLSearchParams();
    if (params.country) {
      preview.set("country", params.country);
    }
    if (params.level) {
      preview.set("level", params.level);
    }
    redirect(preview.size > 0 ? `/preview/scholarships?${preview.toString()}` : "/preview/scholarships");
  }

  const filters = {
    q: (params.q ?? "").trim(),
    country: (params.country ?? "").trim().toUpperCase(),
    level: (params.level ?? "").trim(),
    fieldId: (params.field ?? "").trim(),
    type: (params.type ?? "").trim(),
    availability: (params.availability ?? "").trim(),
  };
  const rows = filterScholarships(
    (await fetchPublishedScholarships()).map(toScholarshipRecord),
    filters,
  );
  const { page, slice, total } = paginateScholarships(
    rows,
    20,
    Number(params.offset ?? "0") || 0,
  );
  const query = {
    q: filters.q,
    country: filters.country,
    level: filters.level,
    field: filters.fieldId,
    type: filters.type,
    availability: filters.availability,
  };

  return (
    <PublicChrome>
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-text">
        <GraduationCap className="size-6" aria-hidden />
        Scholarship directory
      </h1>
      <div className="flex gap-3 text-sm">
        <Link className="text-text-muted" href="/explore/universities">
          Universities
        </Link>
        <span className="font-medium text-primary">Scholarships</span>
      </div>
      <p className="text-sm text-text-muted">
        A filter matches only verified metadata. Closed awards stay readable and are never
        labelled open. Selecting an award does not add funding to savings.
      </p>
      <form method="get" className="grid gap-3 min-[900px]:grid-cols-3">
        <label className="text-sm text-text min-[900px]:col-span-3">
          Search
          <input
            name="q"
            defaultValue={params.q ?? ""}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <label className="text-sm text-text">
          Country
          <input
            name="country"
            defaultValue={filters.country}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <label className="text-sm text-text">
          Level
          <select
            name="level"
            defaultValue={filters.level}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">Any</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="masters">Masters</option>
            <option value="phd">PhD</option>
            <option value="certificate">Certificate</option>
          </select>
        </label>
        <label className="text-sm text-text">
          Field
          <select
            name="field"
            defaultValue={filters.fieldId}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">Any</option>
            {CATALOG_FIELD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-text">
          Type
          <select
            name="type"
            defaultValue={filters.type}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">Any</option>
            {SCHOLARSHIP_TYPES.map((value) => (
              <option key={value} value={value}>
                {scholarshipTypeLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-text">
          Availability
          <select
            name="availability"
            defaultValue={filters.availability}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">Any</option>
            {SCHOLARSHIP_AVAILABILITIES.map((value) => (
              <option key={value} value={value}>
                {value === "open"
                  ? "Open"
                  : value === "closed"
                    ? "Closed"
                    : value === "upcoming"
                      ? "Upcoming"
                      : "Unknown"}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-3 min-[900px]:col-span-3">
          <button
            type="submit"
            className="h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-4 text-sm font-medium"
          >
            Apply filters
          </button>
          <Link
            className="inline-flex h-12 items-center text-sm text-primary underline-offset-2 hover:underline"
            href="/explore/scholarships"
          >
            Reset
          </Link>
        </div>
      </form>
      {slice.length === 0 ? (
        <EmptyState
          filtered
          title="No scholarships"
          message="No published scholarships match these verified filters."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            {total} scholarship{total === 1 ? "" : "s"}
          </p>
          <ul className="grid gap-3">
            {slice.map((row) => (
              <ScholarshipCard
                key={row.id}
                row={row}
                detailsHref={`/scholarships/${row.id}`}
              />
            ))}
          </ul>
        </div>
      )}
      <QueryPagination
        pathname="/explore/scholarships"
        query={query}
        offset={page.offset}
        pageSize={page.limit}
        hasMore={page.offset + slice.length < total}
      />
      <Link
        className="text-sm text-primary underline-offset-2 hover:underline"
        href="/explore/universities"
      >
        Back to universities
      </Link>
    </PublicChrome>
  );
}
