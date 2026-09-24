import { PublicChrome } from "@/components/public/PublicChrome";
import { QueryPagination } from "@/components/public/QueryPagination";
import { SaveProgramButton } from "@/components/public/SaveProgramButton";
import { ScholarshipCard } from "@/components/public/ScholarshipCard";
import { EmptyState } from "@/components/ui/States";
import { catalogPage } from "@/domain/catalog/catalog";
import {
  filterScholarships,
  paginateScholarships,
  toScholarshipRecord,
} from "@/domain/scholarships/scholarships";
import {
  ANNUAL_COMPARISON_LABEL,
  displayMoney,
  displayText,
  NOT_PROVIDED,
  recommendationReasonCopy,
} from "@/domain/catalog/display";
import { CATALOG_FIELD_OPTIONS } from "@/app/(dashboard)/admin/_components/catalog/display";
import {
  buildRecommendationSet,
  isAcademicProfileComplete,
} from "@/domain/recommendations/recommendations";
import { createClient } from "@/lib/supabase/server";
import {
  fetchPublishedAccommodations,
  fetchPublishedIntakes,
  fetchPublishedPrograms,
  fetchPublishedRankings,
  fetchPublishedScholarships,
  fetchPublishedUniversities,
  lowestMonthlyHousing,
  toRecommendationCandidates,
} from "@/server/modules/catalog/public";
import { loadProfile, resolveAccessibleCase } from "@/server/modules/profile/load";
import { loadSaveContext } from "@/server/modules/shortlist/load";
import { alreadySaved } from "@/domain/shortlist/shortlist";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore universities",
  description:
    "Public university and scholarship catalog. Personalized recommendations appear only after a complete academic profile. At most ten universities.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function lowestMonthlyLabel(
  monthly: number | null,
  currency: string | null,
  estimated: boolean,
): string {
  if (monthly === null || !currency) {
    return NOT_PROVIDED;
  }
  return `${monthly.toFixed(2)} ${currency}${estimated ? " (estimated, 30 nights)" : ""}`;
}

export default async function ExploreUniversitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = params.tab === "scholarships" ? "scholarships" : "universities";
  const view = params.view === "recommendations" ? "recommendations" : "all";
  const q = (params.q ?? "").trim().toLowerCase();
  const country = (params.country ?? "").trim().toUpperCase();
  const city = (params.city ?? "").trim().toLowerCase();
  const subject = (params.subject ?? "").trim();
  const level = (params.level ?? "").trim();
  const intake = (params.intake ?? "").trim();
  const costMin = params.costMin ? Number(params.costMin) : Number.NaN;
  const costMax = params.costMax ? Number(params.costMax) : Number.NaN;
  const ranking = (params.ranking ?? "").trim();
  const page = catalogPage(20, Number(params.offset ?? "0") || 0);

  const [universities, programs, scholarships, housing, rankings, intakes] = await Promise.all([
    fetchPublishedUniversities(),
    fetchPublishedPrograms(),
    fetchPublishedScholarships(),
    fetchPublishedAccommodations(),
    fetchPublishedRankings(),
    fetchPublishedIntakes(),
  ]);

  const publishedCountries = new Set(universities.map((row) => row.country)).size;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedInCase = user ? await resolveAccessibleCase(user.id) : null;
  const saveContext = user ? await loadSaveContext(user.id) : null;
  const signedInProfile =
    user && signedInCase ? await loadProfile(signedInCase.id, user.id) : null;
  const preferenceShape = {
    level: signedInProfile?.targetLevel ?? "",
    fieldId: signedInProfile?.fieldIds[0] ?? "",
    disciplineId: signedInProfile?.disciplineIds[0] ?? null,
    specializationId: signedInProfile?.specializationIds[0] ?? null,
    preferredCountries: signedInProfile?.countries.map((row) => row.countryCode) ?? [],
    preferredCities: signedInProfile?.countries.flatMap((row) => row.cities) ?? [],
    requestedSubject: subject || null,
  };
  const profileComplete = Boolean(
    signedInProfile?.caseRow.module2CompletedAt &&
      isAcademicProfileComplete(preferenceShape, publishedCountries),
  );

  const candidates = toRecommendationCandidates(programs, universities, housing, rankings);
  const recommendation = profileComplete
    ? buildRecommendationSet({
        candidates,
        preferences: preferenceShape,
        manualUniversityIds: [],
      })
    : null;

  const query = {
    tab,
    view,
    q,
    country,
    city,
    subject,
    level,
    intake,
    costMin: params.costMin,
    costMax: params.costMax,
    ranking,
  };

  const housingByUniversity = new Map<string, typeof housing>();
  for (const row of housing) {
    const current = housingByUniversity.get(row.university_id) ?? [];
    current.push(row);
    housingByUniversity.set(row.university_id, current);
  }

  const programCards = programs.filter((program) => {
    const university = universities.find((row) => row.id === program.university_id);
    if (!university) {
      return false;
    }
    if (q && !`${university.name} ${program.name}`.toLowerCase().includes(q)) {
      return false;
    }
    if (country && university.country !== country) {
      return false;
    }
    if (city && (university.city ?? "").toLowerCase() !== city) {
      return false;
    }
    if (subject && program.field_id !== subject && !program.name.toLowerCase().includes(subject.toLowerCase())) {
      return false;
    }
    if (level && program.level !== level) {
      return false;
    }
    if (intake) {
      const year = Number(intake);
      const hasIntake = intakes.some(
        (row) => row.program_id === program.id && row.intake_year === year,
      );
      if (!hasIntake) {
        return false;
      }
    }
    const monthly = lowestMonthlyHousing(housingByUniversity.get(university.id) ?? []);
    const comparable = candidates.find((row) => row.programId === program.id)?.annualComparisonCost;
    if (Number.isFinite(costMin) && comparable !== null && comparable !== undefined && comparable < costMin) {
      return false;
    }
    if (Number.isFinite(costMax) && comparable !== null && comparable !== undefined && comparable > costMax) {
      return false;
    }
    if (Number.isFinite(costMin) && comparable === null) {
      return false;
    }
    if (ranking) {
      const rank = rankings.find(
        (row) => row.program_id === program.id || row.university_id === university.id,
      );
      if (!rank || rank.publisher !== ranking) {
        return false;
      }
    }
    return true;
  });

  const unknownLast = [...programCards].sort((left, right) => {
    const leftCost = candidates.find((row) => row.programId === left.id)?.annualComparisonCost ?? null;
    const rightCost = candidates.find((row) => row.programId === right.id)?.annualComparisonCost ?? null;
    if (leftCost === null && rightCost === null) {
      return left.id.localeCompare(right.id);
    }
    if (leftCost === null) {
      return 1;
    }
    if (rightCost === null) {
      return -1;
    }
    return leftCost - rightCost;
  });

  const recommendedIds = new Set(recommendation?.slots.map((slot) => slot.programId) ?? []);
  const visiblePrograms =
    view === "recommendations" && recommendation
      ? unknownLast.filter((program) => recommendedIds.has(program.id))
      : unknownLast;
  const sliced = visiblePrograms.slice(page.offset, page.offset + page.limit);
  const scholarshipRows = filterScholarships(
    scholarships.map(toScholarshipRecord),
    { q, country, level },
  );
  const scholarshipPage = paginateScholarships(scholarshipRows, page.limit, page.offset);
  const scholarshipSlice = scholarshipPage.slice;

  return (
    <PublicChrome>
      <h1 className="text-2xl font-semibold text-text">University discovery</h1>
      <p className="text-sm text-text-muted">
        Saved 0/3. Saving a program opens after financial planning (Prompt 15).
      </p>
      <div className="flex gap-3 text-sm">
        <Link
          className={tab === "universities" ? "font-medium text-primary" : "text-text-muted"}
          href="/explore/universities?tab=universities"
        >
          Universities
        </Link>
        <Link
          className={tab === "scholarships" ? "font-medium text-primary" : "text-text-muted"}
          href="/explore/scholarships"
        >
          Scholarships
        </Link>
      </div>

      <form method="get" className="grid gap-3 min-[900px]:grid-cols-4">
        <input type="hidden" name="tab" value={tab} />
        <label className="text-sm text-text min-[900px]:col-span-2">
          Search university or program
          <input
            name="q"
            defaultValue={params.q ?? ""}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <label className="text-sm text-text">
          Country
          <input name="country" defaultValue={country} className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3" />
        </label>
        <label className="text-sm text-text">
          City
          <input name="city" defaultValue={params.city ?? ""} className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3" />
        </label>
        <label className="text-sm text-text">
          Subject
          <select name="subject" defaultValue={subject} className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3">
            <option value="">Any</option>
            {CATALOG_FIELD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-text">
          Level
          <select name="level" defaultValue={level} className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3">
            <option value="">Any</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="masters">Masters</option>
            <option value="phd">PhD</option>
            <option value="certificate">Certificate</option>
          </select>
        </label>
        <label className="text-sm text-text">
          Intake year
          <input name="intake" defaultValue={intake} className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3" />
        </label>
        <label className="text-sm text-text">
          Min annual comparison
          <input name="costMin" defaultValue={params.costMin ?? ""} className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3" />
        </label>
        <label className="text-sm text-text">
          Max annual comparison
          <input name="costMax" defaultValue={params.costMax ?? ""} className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3" />
        </label>
        <label className="text-sm text-text">
          Ranking publisher
          <select name="ranking" defaultValue={ranking} className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3">
            <option value="">Any</option>
            <option value="qs">QS</option>
            <option value="the">THE</option>
            <option value="country_specific">Country-specific</option>
          </select>
        </label>
        <label className="text-sm text-text">
          Set
          <select name="view" defaultValue={view} className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3">
            <option value="all">All universities</option>
            <option value="recommendations">Recommendations, up to 10</option>
          </select>
        </label>
        <button type="submit" className="h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-4 text-sm font-medium min-[900px]:self-end">
          Apply filters
        </button>
      </form>

      {tab === "scholarships" ? (
        scholarshipSlice.length === 0 ? (
          <EmptyState filtered title="No scholarships" message="No published scholarships match these filters." />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">
              {scholarshipRows.length} scholarship{scholarshipRows.length === 1 ? "" : "s"}.{" "}
              <Link className="text-primary underline-offset-2 hover:underline" href="/explore/scholarships">
                Full directory
              </Link>
            </p>
            <ul className="grid gap-3">
              {scholarshipSlice.map((row) => (
                <ScholarshipCard
                  key={row.id}
                  row={row}
                  detailsHref={`/scholarships/${row.id}`}
                />
              ))}
            </ul>
          </div>
        )
      ) : view === "recommendations" && !profileComplete ? (
        <EmptyState
          title="Recommendations need a complete academic profile"
          message="All universities remain available. Personalization uses level, field and up to three preferred countries."
        />
      ) : sliced.length === 0 ? (
        <EmptyState
          filtered
          title="No published programs"
          message={universities.length === 0 ? "Zero published universities. Coverage is not invented." : "No programs match these filters."}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            {view === "recommendations"
              ? `Recommendations ${sliced.length} of up to 10. Saved ${saveContext?.pairs.length ?? 0}/3.`
              : `${visiblePrograms.length} programs. Saved ${saveContext?.pairs.length ?? 0}/3.`}
          </p>
          <ul className="grid gap-3 min-[768px]:grid-cols-2">
            {sliced.map((program) => {
              const university = universities.find((row) => row.id === program.university_id);
              if (!university) {
                return null;
              }
              const monthly = lowestMonthlyHousing(housingByUniversity.get(university.id) ?? []);
              const candidate = candidates.find((row) => row.programId === program.id);
              const rank = rankings.find(
                (row) => row.program_id === program.id || row.university_id === university.id,
              );
              const reason = recommendation?.slots.find((slot) => slot.programId === program.id);
              return (
                <li key={program.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                  <p className="font-medium text-text">{university.name}</p>
                  <p className="text-sm text-text">{program.name}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {displayText(university.city)}, {university.country}
                  </p>
                  <dl className="mt-3 space-y-1 text-sm text-text">
                    <div className="flex justify-between gap-3">
                      <dt>Annual tuition</dt>
                      <dd>{displayMoney(program.annual_tuition_amount, program.annual_tuition_currency)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Monthly accommodation</dt>
                      <dd>{lowestMonthlyLabel(monthly.monthly, monthly.currency, monthly.estimated)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{ANNUAL_COMPARISON_LABEL}</dt>
                      <dd>
                        {candidate?.annualComparisonCost === null || candidate?.annualComparisonCost === undefined
                          ? NOT_PROVIDED
                          : candidate.annualComparisonCost.toFixed(2)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Course rank</dt>
                      <dd>
                        {rank
                          ? `${rank.rank_min ?? NOT_PROVIDED} · ${rank.publisher} · ${rank.edition_year}`
                          : NOT_PROVIDED}
                      </dd>
                    </div>
                  </dl>
                  {reason ? (
                    <p className="mt-2 text-sm text-text-muted">{recommendationReasonCopy(reason.reason)}</p>
                  ) : null}
                  <div className="mt-3 flex flex-col gap-2">
                    <Link
                      className="text-sm text-primary underline-offset-2 hover:underline"
                      href={`/universities/${university.id}/programs/${program.id}`}
                    >
                      View program
                    </Link>
                    <SaveProgramButton
                      universityId={university.id}
                      programId={program.id}
                      caseId={saveContext?.caseId ?? null}
                      module3Completed={Boolean(saveContext?.module3Completed)}
                      canWrite={Boolean(saveContext?.canWrite)}
                      savedCount={saveContext?.pairs.length ?? 0}
                      alreadySaved={alreadySaved(
                        saveContext?.pairs ?? [],
                        university.id,
                        program.id,
                      )}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <QueryPagination
        pathname="/explore/universities"
        query={query}
        offset={page.offset}
        pageSize={page.limit}
        hasMore={
          tab === "scholarships"
            ? scholarshipPage.page.offset + scholarshipSlice.length < scholarshipRows.length
            : page.offset + sliced.length < visiblePrograms.length
        }
      />
    </PublicChrome>
  );
}
