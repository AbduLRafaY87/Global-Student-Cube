export const RECOMMENDATION_CAP = 10;
export const COST_BAND_RATIO = 1.1;
export const COST_STAGE_QUOTA = 4;
export const RANK_STAGE_QUOTA = 3;

export const RANK_PUBLISHERS = ["qs", "the", "country_specific"] as const;
export type RankPublisher = (typeof RANK_PUBLISHERS)[number];

export const RECOMMENDATION_REASONS = [
  "manual",
  "manual_outside_preferred_countries",
  "city",
  "country",
  "lowest_cost",
  "strongest_rank",
  "fill",
] as const;

export type RecommendationReason = (typeof RECOMMENDATION_REASONS)[number];

export interface CandidateRank {
  publisher: RankPublisher;
  editionYear: number;
  subject: string;
  rankMin: number | null;
  rankMax: number | null;
}

export interface RecommendationCandidate {
  universityId: string;
  programId: string;
  city: string | null;
  country: string;
  level: string;
  fieldId: string;
  disciplineIds: string[];
  specializationIds: string[];
  annualComparisonCost: number | null;
  cityLivingCost: number | null;
  rank: CandidateRank | null;
}

export interface RecommendationPreferences {
  level: string;
  fieldId: string;
  disciplineId: string | null;
  specializationId: string | null;
  preferredCountries: string[];
  preferredCities: string[];
  requestedSubject: string | null;
}

export interface RecommendationInput {
  candidates: RecommendationCandidate[];
  preferences: RecommendationPreferences;
  manualUniversityIds: string[];
}

export interface RankingContext {
  publisher: RankPublisher;
  editionYear: number;
  subject: string;
}

export interface RecommendationSlot {
  universityId: string;
  programId: string;
  reason: RecommendationReason;
}

export interface RecommendationSet {
  slots: RecommendationSlot[];
  rankingContext: RankingContext | null;
  skippedRankStage: boolean;
  emptyReason: string | null;
}

function countryPriority(country: string, preferred: readonly string[]): number {
  const index = preferred.indexOf(country);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

function compareKnownNumber(a: number | null, b: number | null): number {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return a - b;
}

function rankBounds(rank: CandidateRank | null): { min: number | null; max: number | null } {
  if (!rank) {
    return { min: null, max: null };
  }
  return { min: rank.rankMin, max: rank.rankMax };
}

function compareRankStrength(a: CandidateRank | null, b: CandidateRank | null): number {
  const left = rankBounds(a);
  const right = rankBounds(b);
  const byMin = compareKnownNumber(left.min, right.min);
  if (byMin !== 0) {
    return byMin;
  }
  return compareKnownNumber(left.max, right.max);
}

export function isCourseRank(rank: CandidateRank | null): boolean {
  if (!rank) {
    return false;
  }
  return rank.subject.trim().toLowerCase() !== "overall";
}

export function selectRankingContext(
  candidates: readonly RecommendationCandidate[],
  requestedSubject: string | null,
): RankingContext | null {
  const usable = candidates.filter((candidate) => isCourseRank(candidate.rank));
  const subjectMatches = (rank: CandidateRank): boolean =>
    requestedSubject === null || rank.subject === requestedSubject;

  for (const publisher of ["qs", "the"] as const) {
    const pool = usable.filter(
      (candidate) =>
        candidate.rank !== null &&
        candidate.rank.publisher === publisher &&
        subjectMatches(candidate.rank),
    );
    if (pool.length === 0) {
      continue;
    }
    const latest = Math.max(...pool.map((candidate) => candidate.rank?.editionYear ?? 0));
    const subjects = [
      ...new Set(
        pool
          .filter((candidate) => candidate.rank?.editionYear === latest)
          .map((candidate) => candidate.rank?.subject ?? ""),
      ),
    ].sort();
    const subject =
      requestedSubject && subjects.includes(requestedSubject)
        ? requestedSubject
        : subjects[0];
    if (!subject) {
      continue;
    }
    return { publisher, editionYear: latest, subject };
  }

  const countries = new Set(usable.map((candidate) => candidate.country));
  if (countries.size !== 1) {
    return null;
  }

  const countryPool = usable.filter(
    (candidate) =>
      candidate.rank !== null &&
      candidate.rank.publisher === "country_specific" &&
      subjectMatches(candidate.rank),
  );
  if (countryPool.length === 0) {
    return null;
  }
  const latest = Math.max(...countryPool.map((candidate) => candidate.rank?.editionYear ?? 0));
  const subjects = [
    ...new Set(
      countryPool
        .filter((candidate) => candidate.rank?.editionYear === latest)
        .map((candidate) => candidate.rank?.subject ?? ""),
    ),
  ].sort();
  const subject =
    requestedSubject && subjects.includes(requestedSubject)
      ? requestedSubject
      : subjects[0];
  if (!subject) {
    return null;
  }
  return { publisher: "country_specific", editionYear: latest, subject };
}

export function isComparableRank(
  rank: CandidateRank | null,
  context: RankingContext | null,
): boolean {
  if (!rank || !context || !isCourseRank(rank)) {
    return false;
  }
  return (
    rank.publisher === context.publisher &&
    rank.editionYear === context.editionYear &&
    rank.subject === context.subject &&
    rank.rankMin !== null
  );
}

function compareDeterministic(
  left: RecommendationCandidate,
  right: RecommendationCandidate,
  preferences: RecommendationPreferences,
  context: RankingContext | null,
): number {
  const byCountry = countryPriority(left.country, preferences.preferredCountries)
    - countryPriority(right.country, preferences.preferredCountries);
  if (byCountry !== 0) {
    return byCountry;
  }
  const byCost = compareKnownNumber(left.annualComparisonCost, right.annualComparisonCost);
  if (byCost !== 0) {
    return byCost;
  }
  const leftComparable = isComparableRank(left.rank, context);
  const rightComparable = isComparableRank(right.rank, context);
  if (leftComparable !== rightComparable) {
    return leftComparable ? -1 : 1;
  }
  const byRank = compareRankStrength(left.rank, right.rank);
  if (byRank !== 0) {
    return byRank;
  }
  const byUniversity = left.universityId.localeCompare(right.universityId);
  if (byUniversity !== 0) {
    return byUniversity;
  }
  return left.programId.localeCompare(right.programId);
}

function overlapScore(
  ids: readonly string[],
  wanted: string | null,
): number {
  if (!wanted) {
    return 0;
  }
  return ids.includes(wanted) ? 1 : 0;
}

function compareProgramPick(
  left: RecommendationCandidate,
  right: RecommendationCandidate,
  preferences: RecommendationPreferences,
  context: RankingContext | null,
): number {
  const bySpec =
    overlapScore(right.specializationIds, preferences.specializationId)
    - overlapScore(left.specializationIds, preferences.specializationId);
  if (bySpec !== 0) {
    return bySpec;
  }
  const byDiscipline =
    overlapScore(right.disciplineIds, preferences.disciplineId)
    - overlapScore(left.disciplineIds, preferences.disciplineId);
  if (byDiscipline !== 0) {
    return byDiscipline;
  }
  const byCost = compareKnownNumber(left.annualComparisonCost, right.annualComparisonCost);
  if (byCost !== 0) {
    return byCost;
  }
  const leftComparable = isComparableRank(left.rank, context);
  const rightComparable = isComparableRank(right.rank, context);
  if (leftComparable !== rightComparable) {
    return leftComparable ? -1 : 1;
  }
  const byRank = compareRankStrength(left.rank, right.rank);
  if (byRank !== 0) {
    return byRank;
  }
  return left.programId.localeCompare(right.programId);
}

export function matchesTarget(
  candidate: RecommendationCandidate,
  preferences: RecommendationPreferences,
): boolean {
  if (candidate.level !== preferences.level || candidate.fieldId !== preferences.fieldId) {
    return false;
  }
  if (
    preferences.level === "masters"
    && preferences.disciplineId
    && !candidate.disciplineIds.includes(preferences.disciplineId)
  ) {
    return false;
  }
  return true;
}

export function pickRepresentativeProgram(
  programs: readonly RecommendationCandidate[],
  preferences: RecommendationPreferences,
  context: RankingContext | null,
): RecommendationCandidate | null {
  const matching = programs.filter((candidate) => matchesTarget(candidate, preferences));
  if (matching.length === 0) {
    return null;
  }
  return [...matching].sort((left, right) =>
    compareProgramPick(left, right, preferences, context),
  )[0] ?? null;
}

function representativeByUniversity(
  candidates: readonly RecommendationCandidate[],
  preferences: RecommendationPreferences,
  context: RankingContext | null,
): RecommendationCandidate[] {
  const grouped = new Map<string, RecommendationCandidate[]>();
  for (const candidate of candidates) {
    const current = grouped.get(candidate.universityId) ?? [];
    current.push(candidate);
    grouped.set(candidate.universityId, current);
  }
  const picked: RecommendationCandidate[] = [];
  for (const programs of grouped.values()) {
    const representative = pickRepresentativeProgram(programs, preferences, context);
    if (representative) {
      picked.push(representative);
    }
  }
  return picked;
}

function withinPreferredCountries(
  candidate: RecommendationCandidate,
  preferences: RecommendationPreferences,
): boolean {
  if (preferences.preferredCountries.length === 0) {
    return false;
  }
  return preferences.preferredCountries.includes(candidate.country);
}

function sortByTies(
  items: RecommendationCandidate[],
  preferences: RecommendationPreferences,
  context: RankingContext | null,
): RecommendationCandidate[] {
  return [...items].sort((left, right) => {
    const byRank = compareRankStrength(left.rank, right.rank);
    if (byRank !== 0) {
      return byRank;
    }
    const byLiving = compareKnownNumber(left.cityLivingCost, right.cityLivingCost);
    if (byLiving !== 0) {
      return byLiving;
    }
    const byCountry = countryPriority(left.country, preferences.preferredCountries)
      - countryPriority(right.country, preferences.preferredCountries);
    if (byCountry !== 0) {
      return byCountry;
    }
    return left.universityId.localeCompare(right.universityId);
  });
}

export function orderCostBandDisplay(
  items: readonly RecommendationCandidate[],
  preferences: RecommendationPreferences,
  context: RankingContext | null,
): RecommendationCandidate[] {
  const remaining = [...items];
  const ordered: RecommendationCandidate[] = [];

  while (remaining.length > 0) {
    const known = remaining.filter((item) => item.annualComparisonCost !== null);
    if (known.length === 0) {
      ordered.push(...sortByTies(remaining, preferences, context));
      break;
    }
    const anchor = Math.min(
      ...known.map((item) => item.annualComparisonCost as number),
    );
    const ceiling = anchor * COST_BAND_RATIO;
    const band = remaining.filter(
      (item) => item.annualComparisonCost !== null && item.annualComparisonCost <= ceiling,
    );
    const rest = remaining.filter((item) => !band.includes(item));
    ordered.push(...sortByTies(band, preferences, context));
    remaining.splice(0, remaining.length, ...rest);
  }

  return ordered;
}

function firstUnseen(
  pool: RecommendationCandidate[],
  seen: Set<string>,
): RecommendationCandidate | null {
  return pool.find((candidate) => !seen.has(candidate.universityId)) ?? null;
}

function addSlot(
  slots: RecommendationSlot[],
  seen: Set<string>,
  candidate: RecommendationCandidate,
  reason: RecommendationReason,
): void {
  if (slots.length >= RECOMMENDATION_CAP || seen.has(candidate.universityId)) {
    return;
  }
  seen.add(candidate.universityId);
  slots.push({
    universityId: candidate.universityId,
    programId: candidate.programId,
    reason,
  });
}

function uniqueManualIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    unique.push(id);
  }
  return unique.slice(0, RECOMMENDATION_CAP);
}

export function isAcademicProfileComplete(
  preferences: RecommendationPreferences,
  publishedCountryCount: number,
): boolean {
  if (!preferences.level || !preferences.fieldId) {
    return false;
  }
  const requiredCountries = Math.min(3, publishedCountryCount);
  return preferences.preferredCountries.length >= requiredCountries && requiredCountries > 0;
}

export function buildRecommendationSet(input: RecommendationInput): RecommendationSet {
  const matching = input.candidates.filter((candidate) =>
    matchesTarget(candidate, input.preferences),
  );
  if (matching.length === 0) {
    return {
      slots: [],
      rankingContext: null,
      skippedRankStage: true,
      emptyReason:
        "No published programs match the target level and field. Coverage was not relaxed.",
    };
  }

  const rankingContext = selectRankingContext(matching, input.preferences.requestedSubject);
  const representatives = representativeByUniversity(
    matching,
    input.preferences,
    rankingContext,
  );
  const byUniversity = new Map(
    representatives.map((candidate) => [candidate.universityId, candidate]),
  );
  const autoPool = representatives.filter((candidate) =>
    withinPreferredCountries(candidate, input.preferences),
  );
  const slots: RecommendationSlot[] = [];
  const seen = new Set<string>();

  for (const universityId of uniqueManualIds(input.manualUniversityIds)) {
    const candidate = byUniversity.get(universityId);
    if (!candidate) {
      continue;
    }
    const outside = !withinPreferredCountries(candidate, input.preferences);
    addSlot(
      slots,
      seen,
      candidate,
      outside ? "manual_outside_preferred_countries" : "manual",
    );
  }

  const firstManual = uniqueManualIds(input.manualUniversityIds)
    .map((id) => byUniversity.get(id))
    .find((candidate): candidate is RecommendationCandidate => Boolean(candidate));
  const cityAnchor = firstManual?.city ?? input.preferences.preferredCities[0] ?? null;
  if (cityAnchor) {
    const cityPool = autoPool
      .filter((candidate) => candidate.city === cityAnchor)
      .sort((left, right) =>
        compareDeterministic(left, right, input.preferences, rankingContext),
      );
    const cityPick = firstUnseen(cityPool, seen);
    if (cityPick) {
      addSlot(slots, seen, cityPick, "city");
    }
  }

  const countryAnchor = firstManual?.country ?? input.preferences.preferredCountries[0] ?? null;
  if (countryAnchor && slots.length < RECOMMENDATION_CAP) {
    const countryPool = autoPool
      .filter((candidate) => candidate.country === countryAnchor)
      .sort((left, right) =>
        compareDeterministic(left, right, input.preferences, rankingContext),
      );
    const countryPick = firstUnseen(countryPool, seen);
    if (countryPick) {
      addSlot(slots, seen, countryPick, "country");
    }
  }

  if (slots.length < RECOMMENDATION_CAP) {
    const costPool = autoPool
      .filter((candidate) => !seen.has(candidate.universityId) && candidate.annualComparisonCost !== null)
      .sort((left, right) =>
        compareKnownNumber(left.annualComparisonCost, right.annualComparisonCost)
        || left.universityId.localeCompare(right.universityId),
      );
    const costPicks = costPool.slice(0, COST_STAGE_QUOTA);
    const displayed = orderCostBandDisplay(costPicks, input.preferences, rankingContext);
    for (const candidate of displayed) {
      addSlot(slots, seen, candidate, "lowest_cost");
    }
  }

  const skippedRankStage = rankingContext === null;
  if (!skippedRankStage && slots.length < RECOMMENDATION_CAP) {
    const rankPool = autoPool
      .filter(
        (candidate) =>
          !seen.has(candidate.universityId) && isComparableRank(candidate.rank, rankingContext),
      )
      .sort((left, right) =>
        compareRankStrength(left.rank, right.rank)
        || left.universityId.localeCompare(right.universityId),
      );
    for (const candidate of rankPool.slice(0, RANK_STAGE_QUOTA)) {
      addSlot(slots, seen, candidate, "strongest_rank");
    }
  }

  if (slots.length < RECOMMENDATION_CAP) {
    const fillPool = autoPool
      .filter((candidate) => !seen.has(candidate.universityId))
      .sort((left, right) =>
        compareDeterministic(left, right, input.preferences, rankingContext),
      );
    for (const candidate of fillPool) {
      addSlot(slots, seen, candidate, "fill");
      if (slots.length >= RECOMMENDATION_CAP) {
        break;
      }
    }
  }

  return {
    slots,
    rankingContext,
    skippedRankStage,
    emptyReason:
      slots.length === 0
        ? "The published catalog has no remaining matches after exclusions."
        : null,
  };
}

export function guestMatchLimit(universityCount: number, scholarshipCount: number): {
  universities: number;
  scholarships: number;
} {
  return {
    universities: Math.min(5, Math.max(0, universityCount)),
    scholarships: Math.min(2, Math.max(0, scholarshipCount)),
  };
}
