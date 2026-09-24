import { BookmarkScholarshipButton } from "@/components/public/BookmarkScholarshipButton";
import { ProviderHandoff } from "@/components/public/ProviderHandoff";
import { PublicChrome } from "@/components/public/PublicChrome";
import { EmptyState } from "@/components/ui/States";
import {
  displayMoney,
  displayText,
  NOT_PROVIDED,
} from "@/domain/catalog/display";
import {
  availabilityLabel,
  lastVerifiedLabel,
  levelLabel,
  NO_SUBMIT_COPY,
  PROVIDER_DECIDES_CAVEAT,
  providerTypeLabel,
  scholarshipDeadlineLabel,
  scholarshipTypeLabel,
  sourcedOrCheckOfficial,
  toScholarshipRecord,
} from "@/domain/scholarships/scholarships";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/server/modules/admin/http";
import {
  fetchPublishedScholarships,
  fetchPublishedUniversities,
} from "@/server/modules/catalog/public";
import { loadScholarshipBookmarkContext } from "@/server/modules/scholarships/load";
import Link from "next/link";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ scholarshipId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { scholarshipId } = await params;
  return {
    title: "Scholarship",
    description:
      "Published scholarship profile. Applications happen on the provider website. Global Student Cube does not submit applications.",
    robots: isUuid(scholarshipId) ? undefined : { index: false },
  };
}

export default async function ScholarshipDetailPage({ params }: PageProps) {
  const { scholarshipId } = await params;
  if (!isUuid(scholarshipId)) {
    return (
      <PublicChrome>
        <EmptyState title="Scholarship unavailable" message="That record is not a published scholarship." />
      </PublicChrome>
    );
  }

  const [published, universities] = await Promise.all([
    fetchPublishedScholarships(),
    fetchPublishedUniversities(),
  ]);
  const raw = published.find((row) => row.id === scholarshipId);
  if (!raw) {
    return (
      <PublicChrome>
        <EmptyState
          title="Scholarship unavailable"
          message="Unpublished or draft awards are not shown."
        />
      </PublicChrome>
    );
  }

  const row = toScholarshipRecord(raw);
  const university = raw.university_id
    ? universities.find((item) => item.id === raw.university_id)
    : undefined;
  const status = availabilityLabel(row.availability, {
    precision: row.deadlinePrecision,
    date: row.deadlineDate,
  });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const bookmarks = user ? await loadScholarshipBookmarkContext(user.id) : null;

  return (
    <PublicChrome>
      <p className="text-sm text-text-muted">
        <Link className="text-primary underline-offset-2 hover:underline" href="/explore/scholarships">
          Scholarship directory
        </Link>
      </p>
      <h1 className="text-2xl font-semibold text-text">{row.name}</h1>
      <p className="text-sm text-text">{row.providerName}</p>
      <p className="text-sm text-text">
        Status: <span className="font-medium">{status}</span>
      </p>
      <p className="text-sm text-text-muted">{NO_SUBMIT_COPY}</p>

      <section className="space-y-2 rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Official source</h2>
        <p className="text-sm text-text break-all">{displayText(row.officialUrl)}</p>
        <p className="text-sm text-text-muted">Last verified: {lastVerifiedLabel(row.verifiedAt)}</p>
      </section>

      <dl className="grid gap-3 text-sm text-text min-[768px]:grid-cols-2">
        <div>
          <dt className="text-text-muted">Provider type</dt>
          <dd>{providerTypeLabel(row.providerType)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Type</dt>
          <dd>{scholarshipTypeLabel(row.type)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Countries</dt>
          <dd>{row.countryCodes.length > 0 ? row.countryCodes.join(", ") : NOT_PROVIDED}</dd>
        </div>
        <div>
          <dt className="text-text-muted">University</dt>
          <dd>{university?.name ?? NOT_PROVIDED}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Levels</dt>
          <dd>
            {row.levels.length > 0 ? row.levels.map(levelLabel).join(", ") : NOT_PROVIDED}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Fields</dt>
          <dd>{row.fieldIds.length > 0 ? `${row.fieldIds.length} sourced field(s)` : NOT_PROVIDED}</dd>
        </div>
      </dl>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text">Sourced terms</h2>
        <p className="text-sm text-text">
          Eligibility: {sourcedOrCheckOfficial(raw.eligibility_excerpt)}
        </p>
        <p className="text-sm text-text">
          Age and citizenship: {sourcedOrCheckOfficial(raw.age_citizenship)}
        </p>
        <p className="text-sm text-text">Coverage: {sourcedOrCheckOfficial(raw.coverage)}</p>
        <p className="text-sm text-text">
          Amount: {displayMoney(raw.award_amount, raw.award_currency)}
          {raw.award_percent !== null ? ` · ${raw.award_percent}%` : ""}
          {raw.award_basis ? ` · ${raw.award_basis}` : ""}
        </p>
        <p className="text-sm text-text">
          Duration: {sourcedOrCheckOfficial(
            [raw.duration, raw.renewal_conditions].filter(Boolean).join(" · ") || null,
          )}
        </p>
        <p className="text-sm text-text">
          Application mode: {sourcedOrCheckOfficial(raw.application_mode)}
        </p>
        <p className="text-sm text-text">
          Application fee: {sourcedOrCheckOfficial(raw.application_fee)}
        </p>
        <p className="text-sm text-text">
          Required documents: {sourcedOrCheckOfficial(raw.required_documents)}
        </p>
        <p className="text-sm text-text">Contact: {sourcedOrCheckOfficial(raw.contact)}</p>
        <p className="text-sm text-text">Result date: {sourcedOrCheckOfficial(raw.result_date)}</p>
      </section>

      <p className="text-sm text-text">Deadline: {scholarshipDeadlineLabel(row)}</p>
      <p className="text-sm font-medium text-text">{PROVIDER_DECIDES_CAVEAT}</p>

      <ProviderHandoff officialUrl={row.officialUrl} withdrawn={row.withdrawnUrl} />

      <BookmarkScholarshipButton
        caseId={bookmarks?.caseId ?? null}
        scholarshipId={row.id}
        canWrite={Boolean(bookmarks?.canWrite)}
        alreadyBookmarked={Boolean(bookmarks?.scholarshipIds.includes(row.id))}
      />

      {user ? (
        <Link
          className="inline-flex h-12 items-center text-sm text-primary underline-offset-2 hover:underline"
          href="/counselor"
        >
          Discuss with counselor
        </Link>
      ) : (
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
          href="/register"
        >
          Register to discuss with a counselor
        </Link>
      )}
    </PublicChrome>
  );
}
