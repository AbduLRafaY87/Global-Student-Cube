export const VISA_CATEGORIES = [
  "student_visa",
  "exchange",
  "research",
  "short_term",
] as const;
export type VisaCategory = (typeof VISA_CATEGORIES)[number];

export const VISA_CATEGORY_LABELS: Record<VisaCategory, string> = {
  student_visa: "Student visa",
  exchange: "Exchange",
  research: "Research",
  short_term: "Short-term",
};

export const GUIDANCE_LEVELS = [
  "undergraduate",
  "masters",
  "phd",
  "certificate",
] as const;
export type GuidanceLevel = (typeof GUIDANCE_LEVELS)[number];

export const VISA_DOCUMENTS = [
  "passport",
  "offer_letter",
  "financial_proof",
  "photos",
  "visa_form",
  "medical",
  "insurance",
  "other",
] as const;
export type VisaDocument = (typeof VISA_DOCUMENTS)[number];

export const VISA_DOCUMENT_LABELS: Record<VisaDocument, string> = {
  passport: "Passport",
  offer_letter: "Offer letter",
  financial_proof: "Financial proof",
  photos: "Photos",
  visa_form: "Visa form",
  medical: "Medical",
  insurance: "Insurance",
  other: "Other",
};

export const CHECKLIST_STATUSES = [
  "not_started",
  "preparing",
  "available",
  "reviewed",
  "not_applicable",
] as const;
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];

export const PROCESSING_UNITS = ["days", "weeks"] as const;
export type ProcessingUnit = (typeof PROCESSING_UNITS)[number];

export const PRICE_SOURCE_TYPES = ["residence_quote", "city_estimate"] as const;
export type PriceSourceType = (typeof PRICE_SOURCE_TYPES)[number];

export const QUARTERLY_MONTHS = 3;
export const REVIEW_REMINDER_DAYS = 14;

export const NO_VISA_GUARANTEE =
  "This guidance is indicative. It is not a visa approval or a fixed processing guarantee.";

export function isVisaCategory(value: string): value is VisaCategory {
  return (VISA_CATEGORIES as readonly string[]).includes(value);
}

export function isGuidanceLevel(value: string): value is GuidanceLevel {
  return (GUIDANCE_LEVELS as readonly string[]).includes(value);
}

export function canUnlockVisaGuidance(args: {
  counselingCompleted: boolean;
  hasSelectedTarget: boolean;
}): boolean {
  return args.counselingCompleted && args.hasSelectedTarget;
}

export function guidanceLockReason(args: {
  counselingCompleted: boolean;
  hasSelectedTarget: boolean;
}): string | null {
  if (canUnlockVisaGuidance(args)) {
    return null;
  }
  return "Visa guidance unlocks after completed counseling and an explicit target selection.";
}

export function matchCountryGuidance(args: {
  destinationCountry: string;
  studyLevel: string;
  nationality: string;
  rows: readonly {
    country: string;
    studyLevel: string;
    nationalityApplicability: readonly string[];
  }[];
}): boolean {
  return args.rows.some((row) => {
    if (row.country !== args.destinationCountry || row.studyLevel !== args.studyLevel) {
      return false;
    }
    if (row.nationalityApplicability.length === 0) {
      return true;
    }
    return row.nationalityApplicability.includes(args.nationality);
  });
}

export function counselorNotesAreOfficial(): boolean {
  return false;
}

export function claimsVisaApprovalOrGuarantee(copy: string): boolean {
  return /visa approved|guaranteed processing|fixed processing|approval guaranteed/i.test(
    copy,
  );
}

export function missingGuidanceCopy(): string {
  return "Unknown";
}

export function quarterlyReviewDue(args: {
  now: Date;
  nextReviewAt: Date | null;
  verifiedAt: Date | null;
}): boolean {
  if (args.nextReviewAt && args.nextReviewAt.getTime() <= args.now.getTime()) {
    return true;
  }
  if (args.verifiedAt && !args.nextReviewAt) {
    const due = new Date(args.verifiedAt);
    due.setMonth(due.getMonth() + QUARTERLY_MONTHS);
    return due.getTime() <= args.now.getTime();
  }
  return false;
}

export function quarterlyReminderNeeded(args: {
  now: Date;
  nextReviewAt: Date | null;
}): boolean {
  if (!args.nextReviewAt) {
    return false;
  }
  const windowEnd = args.now.getTime() + REVIEW_REMINDER_DAYS * 24 * 60 * 60 * 1000;
  return args.nextReviewAt.getTime() <= windowEnd;
}

export function sourceTrace(args: {
  entityId: string;
  sourceFactId: string | null;
  revision: number | null;
}): { traceable: boolean; sourceFactId: string | null; revision: number | null } {
  return {
    traceable: Boolean(args.sourceFactId),
    sourceFactId: args.sourceFactId,
    revision: args.revision,
  };
}

export function mealIncludedPreventsDoubleCount(mealIncludedInRent: boolean): boolean {
  return mealIncludedInRent;
}

export function mapDirectionsHref(args: {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string;
}): string | null {
  if (args.latitude !== null && args.longitude !== null) {
    return `https://www.openstreetmap.org/?mlat=${args.latitude}&mlon=${args.longitude}#map=16/${args.latitude}/${args.longitude}`;
  }
  if (args.city) {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${args.city} ${args.country}`)}`;
  }
  return null;
}

export function leftoverHousingType(type: string): "dorm" | "apartment" | "family" | "host_family" {
  if (type === "on_campus") {
    return "dorm";
  }
  return "apartment";
}

export function leftoverDocumentKey(name: string): VisaDocument {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes("passport")) {
    return "passport";
  }
  if (normalized.includes("offer")) {
    return "offer_letter";
  }
  if (normalized.includes("financial") || normalized.includes("bank")) {
    return "financial_proof";
  }
  if (normalized.includes("photo")) {
    return "photos";
  }
  if (normalized.includes("form")) {
    return "visa_form";
  }
  if (normalized.includes("medical")) {
    return "medical";
  }
  if (normalized.includes("insurance")) {
    return "insurance";
  }
  return "other";
}

export function leftoverChecklistStatus(completed: boolean): ChecklistStatus {
  return completed ? "available" : "not_started";
}

export function sameFeeMustNotDoubleCount(applicationFeeName: string, visaFeeName: string): boolean {
  return applicationFeeName.trim().toLowerCase() !== visaFeeName.trim().toLowerCase();
}
