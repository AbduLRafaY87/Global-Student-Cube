import { comparableAnnualSum, monthlyAccommodation } from "@/domain/catalog/display";
import { assessmentLabelCopy, type AssessmentLabel } from "@/domain/assessment/assessment";
import { createClient } from "@/lib/supabase/server";
import { loadProfile, resolveAccessibleCase } from "@/server/modules/profile/load";
import {
  fetchPublishedAccommodations,
  fetchPublishedPrograms,
  fetchPublishedUniversities,
} from "@/server/modules/catalog/public";

export interface SavedPairRow {
  id: string;
  universityId: string;
  programId: string;
  slot: number;
  reviewFlagged: boolean;
}

export interface ShortlistCard {
  id: string;
  universityId: string;
  programId: string;
  slot: number;
  reviewFlagged: boolean;
  universityName: string;
  programName: string;
  assessmentLabel: AssessmentLabel | null;
  assessmentCopy: string;
  comparisonCost: string;
}

export interface SaveContext {
  caseId: string;
  module3Completed: boolean;
  canWrite: boolean;
  pairs: SavedPairRow[];
}

export interface ShortlistPageModel {
  caseId: string;
  studentName: string;
  module3Completed: boolean;
  canWrite: boolean;
  cards: ShortlistCard[];
  recommendationCount: number;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function isAssessmentLabel(value: string): value is AssessmentLabel {
  return (
    value === "likely_eligible" ||
    value === "possibly_eligible" ||
    value === "requirements_not_met" ||
    value === "provisional" ||
    value === "unknown"
  );
}

export async function loadSavedPairs(caseId: string): Promise<SavedPairRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_program_pairs")
    .select("id, university_id, program_id, slot, review_flagged")
    .eq("case_id", caseId)
    .order("slot");
  const rows: SavedPairRow[] = [];
  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>;
    const id = asString(row.id);
    const universityId = asString(row.university_id);
    const programId = asString(row.program_id);
    const slot = asNumber(row.slot);
    if (!id || !universityId || !programId || slot === null) {
      continue;
    }
    rows.push({
      id,
      universityId,
      programId,
      slot,
      reviewFlagged: asBoolean(row.review_flagged),
    });
  }
  return rows;
}

export async function loadSaveContext(userId: string): Promise<SaveContext | null> {
  const caseRow = await resolveAccessibleCase(userId);
  if (!caseRow) {
    return null;
  }
  const supabase = await createClient();
  const { data: grants } = await supabase
    .from("case_grants")
    .select("scope")
    .eq("case_id", caseRow.id)
    .eq("account_id", userId)
    .is("revoked_at", null);
  const scopes = (grants ?? []).map((row) => asString(row.scope));
  const isOwner =
    caseRow.studentAccountId === userId || caseRow.operatingGuardianId === userId;
  const pairs = await loadSavedPairs(caseRow.id);
  return {
    caseId: caseRow.id,
    module3Completed: Boolean(caseRow.module3CompletedAt),
    canWrite: isOwner || scopes.includes("shortlist.write"),
    pairs,
  };
}

export async function loadShortlistPage(
  caseId: string,
  userId: string,
): Promise<ShortlistPageModel | null> {
  const profile = await loadProfile(caseId, userId);
  if (!profile || !profile.canReadProfile) {
    const supabase = await createClient();
    const { data: grants } = await supabase
      .from("case_grants")
      .select("scope")
      .eq("case_id", caseId)
      .eq("account_id", userId)
      .is("revoked_at", null);
    const scopes = (grants ?? []).map((row) => asString(row.scope));
    const caseRow = await resolveAccessibleCase(userId);
    const isOwner = caseRow?.id === caseId;
    if (!isOwner && !scopes.includes("shortlist.read") && !scopes.includes("shortlist.write")) {
      return null;
    }
  }

  const supabase = await createClient();
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, student_name, module3_completed_at, student_account_id, operating_guardian_id")
    .eq("id", caseId)
    .maybeSingle();
  if (!caseData) {
    return null;
  }
  const { data: grants } = await supabase
    .from("case_grants")
    .select("scope")
    .eq("case_id", caseId)
    .eq("account_id", userId)
    .is("revoked_at", null);
  const scopes = (grants ?? []).map((row) => asString(row.scope));
  const isOwner =
    asString(caseData.student_account_id) === userId ||
    asString(caseData.operating_guardian_id) === userId;
  if (!isOwner && !scopes.includes("shortlist.read") && !scopes.includes("shortlist.write")) {
    return null;
  }

  const [pairs, assessments, universities, programs, housing] = await Promise.all([
    loadSavedPairs(caseId),
    supabase
      .from("program_self_assessments")
      .select("program_id, label")
      .eq("case_id", caseId),
    fetchPublishedUniversities(),
    fetchPublishedPrograms(),
    fetchPublishedAccommodations(),
  ]);

  const labelByProgram = new Map<string, AssessmentLabel>();
  for (const raw of assessments.data ?? []) {
    const row = raw as Record<string, unknown>;
    const programId = asString(row.program_id);
    const label = asString(row.label);
    if (programId && isAssessmentLabel(label)) {
      labelByProgram.set(programId, label);
    }
  }

  const cards: ShortlistCard[] = pairs.flatMap((pair) => {
    const university = universities.find((row) => row.id === pair.universityId);
    const program = programs.find((row) => row.id === pair.programId);
    if (!university || !program) {
      return [];
    }
    const housingRows = housing.filter((row) => row.university_id === university.id);
    const monthly = housingRows
      .map((row) => monthlyAccommodation(row.amount, row.currency, row.basis))
      .find((row) => row.monthly !== null);
    const cost = comparableAnnualSum(
      program.annual_tuition_amount,
      program.annual_tuition_currency,
      monthly?.monthly ?? null,
      monthly?.currency ?? null,
    );
    const label = labelByProgram.get(pair.programId) ?? null;
    return [
      {
        id: pair.id,
        universityId: pair.universityId,
        programId: pair.programId,
        slot: pair.slot,
        reviewFlagged: pair.reviewFlagged,
        universityName: university.name,
        programName: program.name,
        assessmentLabel: label,
        assessmentCopy: label ? assessmentLabelCopy(label) : "No self-check yet",
        comparisonCost: cost === null ? "Not provided" : cost.toFixed(2),
      },
    ];
  });

  return {
    caseId,
    studentName: asString(caseData.student_name) || "this student",
    module3Completed: Boolean(caseData.module3_completed_at),
    canWrite: isOwner || scopes.includes("shortlist.write"),
    cards,
    recommendationCount: 0,
  };
}
