export const APPLICATION_SYSTEM_CODES = [
  "ucas",
  "common_app",
  "coalition",
  "uc",
  "cal_state",
  "ouac",
  "educationplanner_bc",
  "apply_alberta",
  "uac",
  "vtac",
  "qtac",
  "satac",
  "uni_assist",
  "studielink",
  "parcoursup",
  "direct",
  "legacy_unmapped",
] as const;

export type ApplicationSystemCode = (typeof APPLICATION_SYSTEM_CODES)[number];

export const FILE_PURPOSES = [
  "transcript",
  "passport",
  "recommendation_letter",
  "statement_of_purpose",
  "financial_proof",
  "photo",
  "visa_form",
  "medical",
  "insurance",
  "offer_letter",
  "portfolio",
  "resume",
  "profile_image",
  "introduction_media",
  "advisory_pdf",
  "other",
  "apply_personal_statement",
  "apply_supplement",
  "apply_reference",
  "apply_certified_transcript",
  "apply_vpd",
    "apply_school_report",
    "apply_system_certification",
    "test_result",
    "award_evidence",
] as const;

export type FilePurpose = (typeof FILE_PURPOSES)[number];

export type LeftoverApplicationStatus =
  | "draft"
  | "submitted"
  | "accepted"
  | "rejected";

export type ApplicationGroupState = "draft" | "submitted" | "closed";

export function isFilePurpose(value: string): value is FilePurpose {
  return (FILE_PURPOSES as readonly string[]).includes(value);
}

export function groupStateFromLeftoverStatus(
  status: LeftoverApplicationStatus,
): ApplicationGroupState {
  if (status === "draft") {
    return "draft";
  }
  if (status === "submitted") {
    return "submitted";
  }
  return "closed";
}

export function isPublishedApplicationSystem(code: string): boolean {
  return code !== "legacy_unmapped";
}
