import {
  evaluateAssessment,
  requirementVersionOf,
  type AssessmentAnswer,
  type AssessmentClaim,
  type AssessmentCriterionInput,
  type AssessmentResult,
  type StudentScaleEvidence,
} from "@/domain/assessment/assessment";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/server/modules/admin/http";
import {
  fetchPublishedCriteria,
  fetchPublishedPrograms,
  fetchPublishedUniversities,
} from "@/server/modules/catalog/public";
import { loadProfile } from "@/server/modules/profile/load";

export interface AssessmentPageModel {
  caseId: string;
  programId: string;
  universityId: string;
  universityName: string;
  programName: string;
  canWrite: boolean;
  criteria: AssessmentCriterionInput[];
  claims: AssessmentClaim[];
  evidence: StudentScaleEvidence[];
  files: { id: string; label: string }[];
  result: AssessmentResult;
  storedVersion: string | null;
  currentVersion: string;
  needsReassessment: boolean;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isAnswer(value: string): value is AssessmentAnswer {
  return (
    value === "meets" ||
    value === "does_not_meet" ||
    value === "unknown" ||
    value === "not_applicable"
  );
}

export async function loadAssessmentPage(
  caseId: string,
  programId: string,
  userId: string,
): Promise<AssessmentPageModel | null> {
  if (!isUuid(caseId) || !isUuid(programId)) {
    return null;
  }
  const supabase = await createClient();
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, student_account_id, operating_guardian_id")
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
  if (
    !isOwner &&
    !scopes.includes("shortlist.read") &&
    !scopes.includes("shortlist.write") &&
    !scopes.includes("profile.read")
  ) {
    return null;
  }

  const [universities, programs, published] = await Promise.all([
    fetchPublishedUniversities(),
    fetchPublishedPrograms(),
    fetchPublishedCriteria(programId),
  ]);
  const program = programs.find((row) => row.id === programId);
  const university = program
    ? universities.find((row) => row.id === program.university_id)
    : undefined;
  if (!program || !university) {
    return null;
  }

  const latest = new Map<string, (typeof published)[number]>();
  for (const row of published) {
    const current = latest.get(row.criterion_key);
    if (!current || row.revision > current.revision) {
      latest.set(row.criterion_key, row);
    }
  }
  const criteria: AssessmentCriterionInput[] = [...latest.values()].map((row) => ({
    key: row.criterion_key,
    kind: row.kind,
    weight: row.weight,
    mandatory: row.mandatory,
    requirement: row.requirement,
  }));

  const { data: stored } = await supabase
    .from("program_self_assessments")
    .select("id, requirement_version")
    .eq("case_id", caseId)
    .eq("program_id", programId)
    .maybeSingle();

  let claims: AssessmentClaim[] = [];
  if (stored) {
    const { data: answers } = await supabase
      .from("program_self_assessment_answers")
      .select("criterion_key, answer, evidence_file_id, explanation")
      .eq("assessment_id", asString(stored.id));
    claims = (answers ?? []).flatMap((raw) => {
      const row = raw as Record<string, unknown>;
      const key = asString(row.criterion_key);
      const answer = asString(row.answer);
      if (!key || !isAnswer(answer)) {
        return [];
      }
      return [
        {
          key,
          answer,
          evidenceFileId: asString(row.evidence_file_id) || null,
          explanation: asString(row.explanation),
        },
      ];
    });
  }

  const profile = await loadProfile(caseId, userId);
  const evidence: StudentScaleEvidence[] = (profile?.tests ?? []).map((row) => ({
    kind: "test" as const,
    scaleCode: row.scaleCode,
    scaleVersion: row.scaleVersion,
    score: row.score,
    verified: row.verification === "verified",
  }));
  for (const record of profile?.records ?? []) {
    const score = Number(record.scoreValue);
    if (record.scoreScale && Number.isFinite(score)) {
      evidence.push({
        kind: "education",
        scaleCode: record.scoreScale,
        scaleVersion: "1",
        score,
        verified: record.resultStatus === "available",
      });
    }
  }

  const files = (profile?.files ?? []).map((file) => ({
    id: file.id,
    label: file.originalName ?? file.purpose,
  }));

  const result = evaluateAssessment(criteria, claims, evidence);
  const currentVersion = requirementVersionOf(
    [...latest.values()].map((row) => ({
      id: row.id,
      key: row.criterion_key,
      revision: row.revision,
    })),
  );
  const storedVersion = stored ? asString(stored.requirement_version) : null;

  return {
    caseId,
    programId,
    universityId: university.id,
    universityName: university.name,
    programName: program.name,
    canWrite: isOwner || scopes.includes("shortlist.write"),
    criteria,
    claims,
    evidence,
    files,
    result,
    storedVersion,
    currentVersion,
    needsReassessment: Boolean(storedVersion && storedVersion !== currentVersion),
  };
}

