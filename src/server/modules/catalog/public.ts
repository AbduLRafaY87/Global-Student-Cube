import { CATALOG_FETCH_CAP } from "@/domain/catalog/catalog";
import { createClient } from "@/lib/supabase/server";
import {
  comparableAnnualSum,
  monthlyAccommodation,
} from "@/domain/catalog/display";
import type {
  CandidateRank,
  RecommendationCandidate,
} from "@/domain/recommendations/recommendations";

export interface PublicUniversity {
  id: string;
  name: string;
  slug: string | null;
  aliases: string[];
  country: string;
  city: string | null;
  type: string | null;
  website_url: string | null;
  virtual_tour_url: string | null;
  tour_video_url: string | null;
}

export interface PublicProgram {
  id: string;
  university_id: string;
  name: string;
  level: string;
  field_id: string;
  discipline_ids: string[];
  specialization_ids: string[];
  duration_value: number | null;
  duration_unit: string | null;
  study_modes: string[];
  general_url: string | null;
  accreditation: unknown;
  international_ratio: number | null;
  annual_tuition_amount: number | null;
  annual_tuition_currency: string | null;
  full_program_tuition_amount: number | null;
  full_program_tuition_currency: string | null;
}

export interface PublicScholarship {
  id: string;
  name: string;
  provider_name: string;
  official_url: string;
  provider_type: string | null;
  type: string | null;
  availability: string;
  country_codes: string[];
  levels: string[];
  field_ids: string[];
  university_id: string | null;
  award_amount: number | null;
  award_currency: string | null;
  award_percent: number | null;
  award_basis: string | null;
  deadline_date: string | null;
  deadline_month: number | null;
  deadline_precision: string;
  eligibility_excerpt: string | null;
  verified_at: string | null;
  age_citizenship: string | null;
  coverage: string | null;
  duration: string | null;
  renewal_conditions: string | null;
  application_mode: string | null;
  application_fee: string | null;
  required_documents: string | null;
  contact: string | null;
  result_date: string | null;
}

export interface PublicAccommodation {
  id: string;
  university_id: string;
  name: string;
  type: string;
  amount: number | null;
  currency: string | null;
  basis: string;
  meal_included_in_rent: boolean;
  price_source_type: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  included_costs: string[];
}

export interface PublicRanking {
  id: string;
  university_id: string;
  program_id: string | null;
  publisher: string;
  edition_year: number;
  subject: string;
  rank_representation: string;
  rank_min: number | null;
  rank_max: number | null;
}

export interface PublicIntake {
  id: string;
  program_id: string;
  intake_year: number;
  intake_month: number | null;
  deadline_date: string | null;
  deadline_month: number | null;
  deadline_precision: string;
}

export interface PublicCriterion {
  id: string;
  program_id: string;
  criterion_key: string;
  kind: string;
  requirement: unknown;
  mandatory: boolean;
  weight: number | null;
  revision: number;
}

export interface PublicSourceFact {
  entity_type: string;
  entity_id: string;
  field_path: string;
  canonical_url: string;
  retrieved_at: string;
  source_type: string;
  verified_at: string | null;
  next_review_at: string | null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function mapUniversity(row: Record<string, unknown>): PublicUniversity | null {
  const id = asString(row.id);
  const name = asString(row.name);
  const country = asString(row.country);
  if (!id || !name || !country) {
    return null;
  }
  return {
    id,
    name,
    slug: asString(row.slug),
    aliases: asStringArray(row.aliases),
    country,
    city: asString(row.city),
    type: asString(row.type),
    website_url: asString(row.website_url),
    virtual_tour_url: asString(row.virtual_tour_url),
    tour_video_url: asString(row.tour_video_url),
  };
}

export function mapProgram(row: Record<string, unknown>): PublicProgram | null {
  const id = asString(row.id);
  const universityId = asString(row.university_id);
  const name = asString(row.name);
  const level = asString(row.level);
  const fieldId = asString(row.field_id);
  if (!id || !universityId || !name || !level || !fieldId) {
    return null;
  }
  return {
    id,
    university_id: universityId,
    name,
    level,
    field_id: fieldId,
    discipline_ids: asStringArray(row.discipline_ids),
    specialization_ids: asStringArray(row.specialization_ids),
    duration_value: asNumber(row.duration_value),
    duration_unit: asString(row.duration_unit),
    study_modes: asStringArray(row.study_modes),
    general_url: asString(row.general_url),
    accreditation: row.accreditation ?? {},
    international_ratio: asNumber(row.international_ratio),
    annual_tuition_amount: asNumber(row.annual_tuition_amount),
    annual_tuition_currency: asString(row.annual_tuition_currency),
    full_program_tuition_amount: asNumber(row.full_program_tuition_amount),
    full_program_tuition_currency: asString(row.full_program_tuition_currency),
  };
}

export function mapScholarship(row: Record<string, unknown>): PublicScholarship | null {
  const id = asString(row.id);
  const name = asString(row.name);
  const provider = asString(row.provider_name);
  const url = asString(row.official_url);
  const availability = asString(row.availability);
  if (!id || !name || !provider || !url || !availability) {
    return null;
  }
  return {
    id,
    name,
    provider_name: provider,
    official_url: url,
    provider_type: asString(row.provider_type),
    type: asString(row.type),
    availability,
    country_codes: asStringArray(row.country_codes),
    levels: asStringArray(row.levels),
    field_ids: asStringArray(row.field_ids),
    university_id: asString(row.university_id),
    award_amount: asNumber(row.award_amount),
    award_currency: asString(row.award_currency),
    award_percent: asNumber(row.award_percent),
    award_basis: asString(row.award_basis),
    deadline_date: asString(row.deadline_date),
    deadline_month: asNumber(row.deadline_month),
    deadline_precision: asString(row.deadline_precision) ?? "unknown",
    eligibility_excerpt: asString(row.eligibility_excerpt),
    verified_at: asString(row.verified_at),
    age_citizenship: asString(row.age_citizenship),
    coverage: asString(row.coverage),
    duration: asString(row.duration),
    renewal_conditions: asString(row.renewal_conditions),
    application_mode: asString(row.application_mode),
    application_fee: asString(row.application_fee),
    required_documents: asString(row.required_documents),
    contact: asString(row.contact),
    result_date: asString(row.result_date),
  };
}

export async function fetchPublishedUniversities(): Promise<PublicUniversity[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_universities_public")
    .select(
      "id, name, slug, aliases, country, city, type, website_url, virtual_tour_url, tour_video_url",
    )
    .order("name")
    .limit(CATALOG_FETCH_CAP);
  return (data ?? [])
    .map((row) => mapUniversity(row as Record<string, unknown>))
    .filter((row): row is PublicUniversity => row !== null);
}

export async function fetchPublishedPrograms(): Promise<PublicProgram[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_programs_public")
    .select(
      "id, university_id, name, level, field_id, discipline_ids, specialization_ids, duration_value, duration_unit, study_modes, general_url, accreditation, international_ratio, annual_tuition_amount, annual_tuition_currency, full_program_tuition_amount, full_program_tuition_currency",
    )
    .order("name")
    .limit(CATALOG_FETCH_CAP);
  return (data ?? [])
    .map((row) => mapProgram(row as Record<string, unknown>))
    .filter((row): row is PublicProgram => row !== null);
}

export async function fetchPublishedScholarships(): Promise<PublicScholarship[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_scholarships_public")
    .select(
      "id, name, provider_name, official_url, provider_type, type, availability, country_codes, levels, field_ids, university_id, award_amount, award_currency, award_percent, award_basis, deadline_date, deadline_month, deadline_precision, eligibility_excerpt, verified_at, age_citizenship, coverage, duration, renewal_conditions, application_mode, application_fee, required_documents, contact, result_date",
    )
    .order("name")
    .limit(CATALOG_FETCH_CAP);
  return (data ?? [])
    .map((row) => mapScholarship(row as Record<string, unknown>))
    .filter((row): row is PublicScholarship => row !== null);
}

export async function fetchPublishedAccommodations(): Promise<PublicAccommodation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_accommodations_public")
    .select(
      "id, university_id, name, type, amount, currency, basis, meal_included_in_rent, price_source_type, latitude, longitude, address, included_costs",
    )
    .order("name")
    .limit(CATALOG_FETCH_CAP);
  const rows: PublicAccommodation[] = [];
  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>;
    const id = asString(row.id);
    const universityId = asString(row.university_id);
    const name = asString(row.name);
    const type = asString(row.type);
    const basis = asString(row.basis);
    if (!id || !universityId || !name || !type || !basis) {
      continue;
    }
    const included = Array.isArray(row.included_costs)
      ? row.included_costs.flatMap((item) => {
          if (typeof item === "string") {
            return [item];
          }
          if (item && typeof item === "object" && "name" in item) {
            const nameValue = (item as { name?: unknown }).name;
            return typeof nameValue === "string" ? [nameValue] : [];
          }
          return [];
        })
      : [];
    rows.push({
      id,
      university_id: universityId,
      name,
      type,
      amount: asNumber(row.amount),
      currency: asString(row.currency),
      basis,
      meal_included_in_rent: row.meal_included_in_rent === true,
      price_source_type: asString(row.price_source_type),
      latitude: asNumber(row.latitude),
      longitude: asNumber(row.longitude),
      address: asString(row.address),
      included_costs: included,
    });
  }
  return rows;
}

export async function fetchPublishedRankings(): Promise<PublicRanking[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_rankings_public")
    .select(
      "id, university_id, program_id, publisher, edition_year, subject, rank_representation, rank_min, rank_max",
    )
    .limit(CATALOG_FETCH_CAP);
  const rows: PublicRanking[] = [];
  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>;
    const id = asString(row.id);
    const universityId = asString(row.university_id);
    const publisher = asString(row.publisher);
    const subject = asString(row.subject);
    const year = asNumber(row.edition_year);
    if (!id || !universityId || !publisher || !subject || year === null) {
      continue;
    }
    rows.push({
      id,
      university_id: universityId,
      program_id: asString(row.program_id),
      publisher,
      edition_year: year,
      subject,
      rank_representation: asString(row.rank_representation) ?? "unranked",
      rank_min: asNumber(row.rank_min),
      rank_max: asNumber(row.rank_max),
    });
  }
  return rows;
}

export async function fetchPublishedIntakes(programId?: string): Promise<PublicIntake[]> {
  const supabase = await createClient();
  let query = supabase
    .from("catalog_program_intakes_public")
    .select(
      "id, program_id, intake_year, intake_month, deadline_date, deadline_month, deadline_precision",
    )
    .limit(CATALOG_FETCH_CAP);
  if (programId) {
    query = query.eq("program_id", programId);
  }
  const { data } = await query;
  const rows: PublicIntake[] = [];
  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>;
    const id = asString(row.id);
    const pid = asString(row.program_id);
    const year = asNumber(row.intake_year);
    const precision = asString(row.deadline_precision);
    if (!id || !pid || year === null || !precision) {
      continue;
    }
    rows.push({
      id,
      program_id: pid,
      intake_year: year,
      intake_month: asNumber(row.intake_month),
      deadline_date: asString(row.deadline_date),
      deadline_month: asNumber(row.deadline_month),
      deadline_precision: precision,
    });
  }
  return rows;
}

export async function fetchPublishedCriteria(programId: string): Promise<PublicCriterion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_entry_criteria_public")
    .select("id, program_id, criterion_key, kind, requirement, mandatory, weight, revision")
    .eq("program_id", programId)
    .order("revision", { ascending: false })
    .limit(CATALOG_FETCH_CAP);
  const rows: PublicCriterion[] = [];
  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>;
    const id = asString(row.id);
    const key = asString(row.criterion_key);
    const kind = asString(row.kind);
    if (!id || !key || !kind) {
      continue;
    }
    rows.push({
      id,
      program_id: programId,
      criterion_key: key,
      kind,
      requirement: row.requirement,
      mandatory: row.mandatory === true,
      weight: asNumber(row.weight),
      revision: asNumber(row.revision) ?? 1,
    });
  }
  return rows;
}

export async function fetchPublishedSources(
  entityType: string,
  entityId: string,
): Promise<PublicSourceFact[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_source_facts_public")
    .select(
      "entity_type, entity_id, field_path, canonical_url, retrieved_at, source_type, verified_at, next_review_at",
    )
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .limit(CATALOG_FETCH_CAP);
  const rows: PublicSourceFact[] = [];
  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>;
    const path = asString(row.field_path);
    const url = asString(row.canonical_url);
    const retrieved = asString(row.retrieved_at);
    const sourceType = asString(row.source_type);
    if (!path || !url || !retrieved || !sourceType) {
      continue;
    }
    rows.push({
      entity_type: entityType,
      entity_id: entityId,
      field_path: path,
      canonical_url: url,
      retrieved_at: retrieved,
      source_type: sourceType,
      verified_at: asString(row.verified_at),
      next_review_at: asString(row.next_review_at),
    });
  }
  return rows;
}

export function lowestMonthlyHousing(
  rows: readonly PublicAccommodation[],
): ReturnType<typeof monthlyAccommodation> {
  let best: ReturnType<typeof monthlyAccommodation> = {
    monthly: null,
    currency: null,
    estimated: false,
  };
  for (const row of rows) {
    const current = monthlyAccommodation(row.amount, row.currency, row.basis);
    if (current.monthly === null) {
      continue;
    }
    if (best.monthly === null || current.monthly < best.monthly) {
      best = current;
    }
  }
  return best;
}

export function rankingToCandidate(rank: PublicRanking | undefined): CandidateRank | null {
  if (!rank) {
    return null;
  }
  if (rank.publisher !== "qs" && rank.publisher !== "the" && rank.publisher !== "country_specific") {
    return null;
  }
  return {
    publisher: rank.publisher,
    editionYear: rank.edition_year,
    subject: rank.subject,
    rankMin: rank.rank_min,
    rankMax: rank.rank_max,
  };
}

export function toRecommendationCandidates(
  programs: readonly PublicProgram[],
  universities: readonly PublicUniversity[],
  housing: readonly PublicAccommodation[],
  rankings: readonly PublicRanking[],
): RecommendationCandidate[] {
  const universitiesById = new Map(universities.map((row) => [row.id, row]));
  const housingByUniversity = new Map<string, PublicAccommodation[]>();
  for (const row of housing) {
    const current = housingByUniversity.get(row.university_id) ?? [];
    current.push(row);
    housingByUniversity.set(row.university_id, current);
  }

  return programs.flatMap((program) => {
    const university = universitiesById.get(program.university_id);
    if (!university) {
      return [];
    }
    const monthly = lowestMonthlyHousing(housingByUniversity.get(university.id) ?? []);
    const programRank = rankings.find((row) => row.program_id === program.id);
    const universityRank = rankings.find(
      (row) => row.university_id === university.id && row.program_id === null,
    );
    return [
      {
        universityId: university.id,
        programId: program.id,
        city: university.city,
        country: university.country,
        level: program.level,
        fieldId: program.field_id,
        disciplineIds: program.discipline_ids,
        specializationIds: program.specialization_ids,
        annualComparisonCost: comparableAnnualSum(
          program.annual_tuition_amount,
          program.annual_tuition_currency,
          monthly.monthly,
          monthly.currency,
        ),
        cityLivingCost: monthly.monthly,
        rank: rankingToCandidate(programRank ?? universityRank),
      },
    ];
  });
}

export async function fetchCoverage(): Promise<{
  universityCount: number;
  countryCount: number;
}> {
  const supabase = await createClient();
  const [{ count }, { data }] = await Promise.all([
    supabase
      .from("catalog_universities_public")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("catalog_universities_public")
      .select("country")
      .limit(CATALOG_FETCH_CAP),
  ]);
  return {
    universityCount: count ?? 0,
    countryCount: new Set(
      (data ?? []).flatMap((row) =>
        typeof row.country === "string" && row.country ? [row.country] : [],
      ),
    ).size,
  };
}
