import { createClient } from "@/lib/supabase/server";
import {
  parseBoard,
  parseScoreScale,
  type EducationRecordInput,
  type InstitutionLevel,
} from "@/domain/profile/education";
import type { ActivityInput, AwardInput, RelativeInput } from "@/domain/profile/experience";
import type { CountryPreferenceInput } from "@/domain/profile/preferences";
import type { TestResultInput, TestSubscoreInput } from "@/domain/profile/tests";

export interface LoadedCase {
  id: string;
  studentName: string;
  module2CompletedAt: string | null;
  module3CompletedAt: string | null;
  studentAccountId: string | null;
  operatingGuardianId: string | null;
}

export interface LoadedFile {
  id: string;
  purpose: string;
  originalName: string | null;
  state: string;
  declaredMime: string;
  sizeBytes: number;
  createdAt: string;
}

export interface LoadedProfile {
  caseRow: LoadedCase;
  level: string;
  educationYears: number | null;
  continuingField: boolean | null;
  targetLevel: string;
  fieldIds: string[];
  previousFieldIds: string[];
  disciplineIds: string[];
  specializationIds: string[];
  intakeMonth: number | null;
  intakeYear: number | null;
  intakeUndecided: boolean;
  careerGoal: string;
  accommodation: string;
  introFileId: string | null;
  introLanguage: string;
  introCaption: string;
  testsTaken: boolean | null;
  scholarshipReceived: boolean | null;
  scholarshipNotGranted: boolean | null;
  records: EducationRecordInput[];
  tests: TestResultInput[];
  countries: CountryPreferenceInput[];
  activities: ActivityInput[];
  awards: AwardInput[];
  relative: RelativeInput;
  files: LoadedFile[];
  lastActor: string | null;
  canWrite: boolean;
  canReadProfile: boolean;
  canReadFinance: boolean;
  canWriteFinance: boolean;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
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
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function asInstitutionLevel(value: string): InstitutionLevel {
  if (value === "college" || value === "university" || value === "school") {
    return value;
  }
  return "school";
}

export async function resolveAccessibleCase(
  userId: string,
  requestedId?: string,
): Promise<LoadedCase | null> {
  const supabase = await createClient();
  if (requestedId) {
    const { data } = await supabase
      .from("cases")
      .select("id, student_name, module2_completed_at, module3_completed_at, student_account_id, operating_guardian_id")
      .eq("id", requestedId)
      .maybeSingle();
    if (!data || typeof data.id !== "string") {
      return null;
    }
    return {
      id: data.id,
      studentName: asString(data.student_name),
      module2CompletedAt:
        typeof data.module2_completed_at === "string" ? data.module2_completed_at : null,
      module3CompletedAt:
        typeof data.module3_completed_at === "string" ? data.module3_completed_at : null,
      studentAccountId:
        typeof data.student_account_id === "string" ? data.student_account_id : null,
      operatingGuardianId:
        typeof data.operating_guardian_id === "string" ? data.operating_guardian_id : null,
    };
  }

  const { data: own } = await supabase
    .from("cases")
    .select("id, student_name, module2_completed_at, module3_completed_at, student_account_id, operating_guardian_id")
    .eq("student_account_id", userId)
    .maybeSingle();
  if (own && typeof own.id === "string") {
    return {
      id: own.id,
      studentName: asString(own.student_name),
      module2CompletedAt:
        typeof own.module2_completed_at === "string" ? own.module2_completed_at : null,
      module3CompletedAt:
        typeof own.module3_completed_at === "string" ? own.module3_completed_at : null,
      studentAccountId:
        typeof own.student_account_id === "string" ? own.student_account_id : null,
      operatingGuardianId:
        typeof own.operating_guardian_id === "string" ? own.operating_guardian_id : null,
    };
  }

  const { data: grant } = await supabase
    .from("case_grants")
    .select("case_id")
    .eq("account_id", userId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();
  if (!grant || typeof grant.case_id !== "string") {
    return null;
  }
  return resolveAccessibleCase(userId, grant.case_id);
}

export async function loadProfile(caseId: string, userId: string): Promise<LoadedProfile | null> {
  const supabase = await createClient();
  const caseRow = await resolveAccessibleCase(userId, caseId);
  if (!caseRow) {
    return null;
  }

  const [
    profileRes,
    recordsRes,
    testsRes,
    countriesRes,
    activitiesRes,
    awardsRes,
    relativesRes,
    filesRes,
    grantsRes,
    auditRes,
  ] = await Promise.all([
    supabase.from("academic_profiles").select("*").eq("case_id", caseId).maybeSingle(),
    supabase.from("education_records").select("*").eq("case_id", caseId).order("created_at"),
    supabase.from("test_results").select("*").eq("case_id", caseId).order("taken_on"),
    supabase.from("country_preferences").select("*").eq("case_id", caseId).order("priority"),
    supabase.from("student_activities").select("*").eq("case_id", caseId).order("ordinal"),
    supabase.from("student_awards").select("*").eq("case_id", caseId),
    supabase.from("relative_connections").select("*").eq("case_id", caseId),
    supabase.from("files").select("*").eq("case_id", caseId).neq("state", "deleted").order("created_at"),
    supabase.from("case_grants").select("scope").eq("case_id", caseId).eq("account_id", userId).is("revoked_at", null),
    supabase
      .from("audit_events")
      .select("actor_id, occurred_at")
      .eq("resource_id", caseId)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  const isOwner =
    caseRow.studentAccountId === userId || caseRow.operatingGuardianId === userId;
  const scopes = (grantsRes.data ?? []).map((row) => asString(row.scope));
  const canWrite = isOwner || scopes.includes("profile.write");
  const canReadProfile = isOwner || scopes.includes("profile.read") || scopes.includes("profile.write");
  const canReadFinance = isOwner || scopes.includes("finance.read") || scopes.includes("finance.write");
  const canWriteFinance = isOwner || scopes.includes("finance.write");

  const records: EducationRecordInput[] = (recordsRes.data ?? []).flatMap((row) => {
    const board = parseBoard(asString(row.board));
    const scale = parseScoreScale(asString(row.score_scale));
    const resultStatus = asString(row.result_status);
    const completionStatus = asString(row.completion_status);
    if (
      resultStatus !== "available" &&
      resultStatus !== "awaiting_result" &&
      resultStatus !== "not_available"
    ) {
      return [];
    }
    if (
      completionStatus !== "completed" &&
      completionStatus !== "currently_studying" &&
      completionStatus !== "awaiting_result"
    ) {
      return [];
    }
    return [
      {
        institution: asString(row.institution),
        level: asInstitutionLevel(asString(row.level)),
        country: asString(row.country),
        city: asString(row.city),
        board: board.system,
        boardOther: board.other,
        completionYear: asNumber(row.completion_year),
        completionStatus,
        resultStatus,
        scoreValue: asString(row.score_value),
        scoreScale: scale.scale,
        scoreBounds: scale.bounds,
        evidenceId: typeof row.evidence_id === "string" ? row.evidence_id : null,
      },
    ];
  });

  const tests: TestResultInput[] = (testsRes.data ?? []).flatMap((row) => {
    const testType = asString(row.test_type);
    if (
      testType !== "IELTS" &&
      testType !== "TOEFL" &&
      testType !== "SAT" &&
      testType !== "GRE" &&
      testType !== "OTHER"
    ) {
      return [];
    }
    const verification = asString(row.verification);
    if (
      verification !== "unverified" &&
      verification !== "evidence_attached" &&
      verification !== "counselor_review" &&
      verification !== "verified"
    ) {
      return [];
    }
    const rawSubs = Array.isArray(row.subscores) ? row.subscores : [];
    const subscores: TestSubscoreInput[] = rawSubs.flatMap((item: unknown) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }
      const record = item as Record<string, unknown>;
      return [
        {
          name: asString(record.name),
          score: asNumber(record.score),
          reported: asString(record.reported),
        },
      ];
    });
    return [
      {
        testType,
        testVariant: asString(row.test_variant),
        scaleCode: asString(row.scale_code),
        scaleVersion: asString(row.scale_version),
        score: asNumber(row.score),
        reportedScore: asString(row.reported_score),
        subscores,
        comparableTotal: asNumber(row.comparable_total),
        takenOn: asString(row.taken_on).slice(0, 10),
        evidenceId: typeof row.evidence_id === "string" ? row.evidence_id : null,
        verification,
      },
    ];
  });

  const countries: CountryPreferenceInput[] = (countriesRes.data ?? []).map((row) => ({
    countryCode: asString(row.country_code),
    priority: asNumber(row.priority) ?? 1,
    cities: asStringArray(row.cities),
  }));

  const activities: ActivityInput[] = (activitiesRes.data ?? []).flatMap((row) => {
    const type = asString(row.type);
    if (
      type !== "sport" &&
      type !== "academic" &&
      type !== "volunteer" &&
      type !== "arts" &&
      type !== "other"
    ) {
      return [];
    }
    return [
      {
        ordinal: asNumber(row.ordinal) ?? 1,
        type,
        otherType: asString(row.other_type),
        name: asString(row.name),
        role: asString(row.role),
        durationMonths: asNumber(row.duration_months),
        durationText: asString(row.duration_text),
        hoursWeek: asNumber(row.hours_week),
        achievements: asString(row.achievements),
      },
    ];
  });

  const awards: AwardInput[] = (awardsRes.data ?? []).flatMap((row) => {
    const outcome = asString(row.outcome);
    if (outcome !== "received" && outcome !== "not_granted") {
      return [];
    }
    return [
      {
        name: asString(row.name),
        outcome,
        year: asNumber(row.year),
        amount: asNumber(row.amount),
        currency: asString(row.currency) || null,
        evidenceId: typeof row.evidence_id === "string" ? row.evidence_id : null,
        evidenceUnavailableReason: asString(row.evidence_unavailable_reason),
      },
    ];
  });

  const relativeRow = relativesRes.data?.[0];
  const relative: RelativeInput = relativeRow
    ? {
        hasRelative: true,
        relationship: asString(relativeRow.relationship),
        country: asString(relativeRow.country),
        city: asString(relativeRow.city),
      }
    : { hasRelative: false, relationship: "", country: "", city: "" };

  const files: LoadedFile[] = (filesRes.data ?? []).flatMap((row) => {
    if (typeof row.id !== "string") {
      return [];
    }
    return [
      {
        id: row.id,
        purpose: asString(row.purpose),
        originalName: typeof row.original_name === "string" ? row.original_name : null,
        state: asString(row.state),
        declaredMime: asString(row.declared_mime),
        sizeBytes: asNumber(row.size_bytes) ?? 0,
        createdAt: asString(row.created_at),
      },
    ];
  });

  return {
    caseRow,
    level: asString(profile?.level),
    educationYears: asNumber(profile?.education_years),
    continuingField:
      typeof profile?.continuing_field === "boolean" ? profile.continuing_field : null,
    targetLevel: asString(profile?.target_level),
    fieldIds: asStringArray(profile?.field_ids),
    previousFieldIds: asStringArray(profile?.previous_field_ids),
    disciplineIds: asStringArray(profile?.discipline_ids),
    specializationIds: asStringArray(profile?.specialization_ids),
    intakeMonth: asNumber(profile?.intake_month),
    intakeYear: asNumber(profile?.intake_year),
    intakeUndecided: Boolean(profile?.intake_undecided),
    careerGoal: asString(profile?.career_goal),
    accommodation: asString(profile?.accommodation),
    introFileId: typeof profile?.intro_file_id === "string" ? profile.intro_file_id : null,
    introLanguage: asString(profile?.intro_language),
    introCaption: asString(profile?.intro_caption),
    testsTaken: typeof profile?.tests_taken === "boolean" ? profile.tests_taken : null,
    scholarshipReceived:
      typeof profile?.scholarship_received === "boolean" ? profile.scholarship_received : null,
    scholarshipNotGranted:
      typeof profile?.scholarship_not_granted === "boolean"
        ? profile.scholarship_not_granted
        : null,
    records,
    tests,
    countries,
    activities,
    awards,
    relative,
    files,
    lastActor: typeof auditRes.data?.actor_id === "string" ? auditRes.data.actor_id : null,
    canWrite,
    canReadProfile,
    canReadFinance,
    canWriteFinance,
  };
}
