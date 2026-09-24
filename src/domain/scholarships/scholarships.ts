import { catalogPage, type CatalogPage } from "../catalog/catalog";
import { displayDeadline, NOT_PROVIDED } from "../catalog/display";

export const SCHOLARSHIP_AVAILABILITIES = [
  "open",
  "closed",
  "upcoming",
  "unknown",
] as const;
export type ScholarshipAvailability = (typeof SCHOLARSHIP_AVAILABILITIES)[number];

export const SCHOLARSHIP_TYPES = [
  "merit",
  "need",
  "country_specific",
  "program_specific",
  "external",
] as const;
export type ScholarshipType = (typeof SCHOLARSHIP_TYPES)[number];

export const GUEST_PREVIEW_CAP = 8;
export const PROVIDER_DECIDES_CAVEAT = "Provider decides eligibility.";
export const NO_SUBMIT_COPY =
  "Global Student Cube does not submit scholarship applications.";
export const CHECK_OFFICIAL_PAGE = "Check official scholarship page.";
export const SEE_PROVIDER_TERMS = "See provider for full terms.";
export const EXIT_WARNING =
  "You are leaving Global Student Cube to view official scholarship information.";
export const HANDOFF_DOES_NOT_SUBMIT =
  "Visiting the provider does not mark an application submitted.";

export interface ScholarshipRecord {
  id: string;
  name: string;
  providerName: string;
  officialUrl: string;
  providerType: string | null;
  type: string | null;
  countryCodes: string[];
  levels: string[];
  fieldIds: string[];
  availability: ScholarshipAvailability;
  deadlinePrecision: string;
  deadlineDate: string | null;
  deadlineMonth: number | null;
  eligibilityExcerpt: string | null;
  verifiedAt: string | null;
  withdrawnUrl: boolean;
}

export interface ScholarshipFilters {
  q?: string;
  country?: string;
  level?: string;
  fieldId?: string;
  type?: string;
  availability?: string;
}

export function isScholarshipAvailability(
  value: string,
): value is ScholarshipAvailability {
  return (SCHOLARSHIP_AVAILABILITIES as readonly string[]).includes(value);
}

export function availabilityLabel(
  availability: string,
  deadline?: { precision: string; date: string | null },
  today = new Date().toISOString().slice(0, 10),
): string {
  if (
    deadline?.precision === "day" &&
    deadline.date &&
    deadline.date < today
  ) {
    return "Closed";
  }
  switch (availability) {
    case "open":
      return "Open";
    case "closed":
      return "Closed";
    case "upcoming":
      return "Upcoming";
    default:
      return "Unknown";
  }
}

export function isLabeledOpen(label: string): boolean {
  return label === "Open";
}

export function effectiveAvailability(
  availability: string,
  deadline?: { precision: string; date: string | null },
  today = new Date().toISOString().slice(0, 10),
): ScholarshipAvailability {
  if (availabilityLabel(availability, deadline, today) === "Closed") {
    return "closed";
  }
  return isScholarshipAvailability(availability) ? availability : "unknown";
}

export function scholarshipDeadlineLabel(row: Pick<
  ScholarshipRecord,
  "deadlinePrecision" | "deadlineDate" | "deadlineMonth"
>): string {
  return displayDeadline({
    precision: row.deadlinePrecision,
    date: row.deadlineDate,
    month: row.deadlineMonth,
  });
}

export function lastVerifiedLabel(verifiedAt: string | null): string {
  if (!verifiedAt) {
    return NOT_PROVIDED;
  }
  const day = verifiedAt.slice(0, 10);
  return day || NOT_PROVIDED;
}

export function metadataIsVerified(
  values: readonly string[] | string | null,
): boolean {
  if (values === null) {
    return false;
  }
  if (typeof values === "string") {
    return values.trim() !== "";
  }
  return values.length > 0;
}

export function matchesScholarshipFilters(
  row: ScholarshipRecord,
  filters: ScholarshipFilters,
): boolean {
  const q = (filters.q ?? "").trim().toLowerCase();
  if (q && !`${row.name} ${row.providerName}`.toLowerCase().includes(q)) {
    return false;
  }

  const country = (filters.country ?? "").trim().toUpperCase();
  if (country) {
    if (!metadataIsVerified(row.countryCodes) || !row.countryCodes.includes(country)) {
      return false;
    }
  }

  const level = (filters.level ?? "").trim();
  if (level) {
    if (!metadataIsVerified(row.levels) || !row.levels.includes(level)) {
      return false;
    }
  }

  const fieldId = (filters.fieldId ?? "").trim();
  if (fieldId) {
    if (!metadataIsVerified(row.fieldIds) || !row.fieldIds.includes(fieldId)) {
      return false;
    }
  }

  const type = (filters.type ?? "").trim();
  if (type) {
    if (!metadataIsVerified(row.type) || row.type !== type) {
      return false;
    }
  }

  const availability = (filters.availability ?? "").trim();
  if (availability) {
    const effective = effectiveAvailability(row.availability, {
      precision: row.deadlinePrecision,
      date: row.deadlineDate,
    });
    if (effective !== availability) {
      return false;
    }
  }

  return true;
}

export function filterScholarships(
  rows: readonly ScholarshipRecord[],
  filters: ScholarshipFilters,
): ScholarshipRecord[] {
  return rows.filter((row) => matchesScholarshipFilters(row, filters));
}

export function paginateScholarships(
  rows: readonly ScholarshipRecord[],
  limit: number | undefined,
  offset: number | undefined,
): { page: CatalogPage; slice: ScholarshipRecord[]; total: number } {
  const page = catalogPage(limit, offset);
  return {
    page,
    slice: rows.slice(page.offset, page.offset + page.limit),
    total: rows.length,
  };
}

export function guestPreviewRows(
  rows: readonly ScholarshipRecord[],
  filters: Pick<ScholarshipFilters, "q" | "country" | "level">,
): ScholarshipRecord[] {
  return filterScholarships(rows, filters).slice(0, GUEST_PREVIEW_CAP);
}

export function bookmarkAddsFunding(): boolean {
  return false;
}

export function leftoverCountryCodes(country: string): string[] {
  const trimmed = country.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(trimmed)) {
    return [trimmed];
  }
  return [];
}

export interface ScholarshipRowInput {
  id: string;
  name: string;
  provider_name: string;
  official_url: string;
  provider_type: string | null;
  type: string | null;
  country_codes: string[];
  levels: string[];
  field_ids: string[];
  availability: string;
  deadline_precision: string;
  deadline_date: string | null;
  deadline_month: number | null;
  eligibility_excerpt: string | null;
  verified_at: string | null;
}

export function toScholarshipRecord(row: ScholarshipRowInput): ScholarshipRecord {
  return {
    id: row.id,
    name: row.name,
    providerName: row.provider_name,
    officialUrl: row.official_url,
    providerType: row.provider_type,
    type: row.type,
    countryCodes: row.country_codes,
    levels: row.levels,
    fieldIds: row.field_ids,
    availability: isScholarshipAvailability(row.availability)
      ? row.availability
      : "unknown",
    deadlinePrecision: row.deadline_precision,
    deadlineDate: row.deadline_date,
    deadlineMonth: row.deadline_month,
    eligibilityExcerpt: row.eligibility_excerpt,
    verifiedAt: row.verified_at,
    withdrawnUrl: false,
  };
}

export function providerTypeLabel(value: string | null): string {
  switch (value) {
    case "university":
      return "University";
    case "government":
      return "Government";
    case "private_foundation":
      return "Private foundation";
    case "ngo":
      return "NGO";
    default:
      return NOT_PROVIDED;
  }
}

export function scholarshipTypeLabel(value: string | null): string {
  switch (value) {
    case "merit":
      return "Merit";
    case "need":
      return "Need";
    case "country_specific":
      return "Country-specific";
    case "program_specific":
      return "Program-specific";
    case "external":
      return "External";
    default:
      return NOT_PROVIDED;
  }
}

export function levelLabel(value: string): string {
  switch (value) {
    case "undergraduate":
      return "Undergraduate";
    case "masters":
      return "Masters";
    case "phd":
      return "PhD";
    case "certificate":
      return "Certificate";
    default:
      return value;
  }
}

export function sourcedOrCheckOfficial(value: string | null | undefined): string {
  if (!value || value.trim() === "") {
    return CHECK_OFFICIAL_PAGE;
  }
  return value;
}
