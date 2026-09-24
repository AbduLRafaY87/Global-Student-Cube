import {
  type HousingDisclosure,
  type HousingInput,
  type HousingConstruction,
  type HousingRooms,
  type HousingStatus,
  type HousingStructure,
  type TriState,
  HOUSING_CONSTRUCTIONS,
  HOUSING_DISCLOSURES,
  HOUSING_ROOMS,
  HOUSING_STATUSES,
  HOUSING_STRUCTURES,
} from "@/domain/finance/finance";
import { createClient } from "@/lib/supabase/server";

export interface LoadedFinance {
  caseId: string;
  studentName: string;
  version: number;
  module3CompletedAt: string | null;
  occupation: string;
  income: number | null;
  incomeCurrency: string | null;
  incomeDeclined: boolean | null;
  savings: number | null;
  savingsCurrency: string | null;
  savingsDeclined: boolean | null;
  housing: HousingInput;
  sponsorAvailable: TriState | "";
  incomeProofAvailable: TriState | "";
  canWrite: boolean;
  canRead: boolean;
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

function pick<T extends string>(value: string, allowed: readonly T[]): T | "" {
  return (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

function housingFromJson(value: unknown): HousingInput {
  const record =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    disclosure: pick(asString(record.disclosure), HOUSING_DISCLOSURES) as
      | HousingDisclosure
      | "",
    status: pick(asString(record.status), HOUSING_STATUSES) as HousingStatus | "",
    structure: pick(asString(record.structure), HOUSING_STRUCTURES) as
      | HousingStructure
      | "",
    structureOther: asString(record.structure_other ?? record.structureOther),
    construction: pick(asString(record.construction), HOUSING_CONSTRUCTIONS) as
      | HousingConstruction
      | "",
    rooms: pick(asString(record.rooms), HOUSING_ROOMS) as HousingRooms | "",
  };
}

function triFromBoolean(value: unknown): TriState | "" {
  if (value === true) {
    return "yes";
  }
  if (value === false) {
    return "no";
  }
  if (value === null) {
    return "prefer_not";
  }
  return "";
}

export async function loadFinance(
  caseId: string,
  userId: string,
): Promise<LoadedFinance | null> {
  const supabase = await createClient();
  const { data: caseRow } = await supabase
    .from("cases")
    .select(
      "id, student_name, student_account_id, operating_guardian_id, version, module3_completed_at",
    )
    .eq("id", caseId)
    .maybeSingle();
  if (!caseRow || typeof caseRow.id !== "string") {
    return null;
  }

  const isOwner =
    caseRow.student_account_id === userId || caseRow.operating_guardian_id === userId;
  const { data: grantRows } = await supabase
    .from("case_grants")
    .select("scope")
    .eq("case_id", caseId)
    .eq("account_id", userId)
    .is("revoked_at", null);
  const scopes = (grantRows ?? []).map((row) => asString(row.scope));
  const canWrite = isOwner || scopes.includes("finance.write");
  const canRead = isOwner || scopes.includes("finance.read") || scopes.includes("finance.write");
  if (!canRead) {
    return null;
  }

  const { data: profile } = await supabase
    .from("financial_profiles")
    .select("*")
    .eq("case_id", caseId)
    .maybeSingle();

  const declinedKnown = profile !== null;
  return {
    caseId: caseRow.id,
    studentName: asString(caseRow.student_name),
    version: asNumber(caseRow.version) ?? 1,
    module3CompletedAt:
      typeof caseRow.module3_completed_at === "string" ? caseRow.module3_completed_at : null,
    occupation: asString(profile?.occupation),
    income: asNumber(profile?.income),
    incomeCurrency: asString(profile?.income_currency) || null,
    incomeDeclined: declinedKnown ? Boolean(profile?.income_declined) : null,
    savings: asNumber(profile?.savings),
    savingsCurrency: asString(profile?.savings_currency) || null,
    savingsDeclined: declinedKnown ? Boolean(profile?.savings_declined) : null,
    housing: housingFromJson(profile?.housing),
    sponsorAvailable: declinedKnown
      ? (triFromBoolean(profile?.sponsor_available) as TriState | "")
      : "",
    incomeProofAvailable: declinedKnown
      ? (triFromBoolean(profile?.income_proof_available) as TriState | "")
      : "",
    canWrite,
    canRead,
  };
}
