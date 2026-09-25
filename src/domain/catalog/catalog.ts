export const CATALOG_PUBLICATION_STATES = [
  "draft",
  "in_review",
  "published",
  "withdrawn",
] as const;

export type CatalogPublicationState =
  (typeof CATALOG_PUBLICATION_STATES)[number];

export const CATALOG_ENTITY_TYPES = [
  "university",
  "program",
  "scholarship",
  "accommodation",
  "country_guidance",
] as const;

export type CatalogEntityType = (typeof CATALOG_ENTITY_TYPES)[number];

export const CATALOG_PAGE_DEFAULT = 20;
export const CATALOG_PAGE_MAX = 50;
/** Safety cap for catalog fetches that are not yet SQL-paginated. */
export const CATALOG_FETCH_CAP = 500;
export const EXCLUDED_PUBLIC_FIELDS = ["acceptance_rate"] as const;

export const PUBLIC_UNIVERSITY_FIELDS = [
  "id",
  "name",
  "slug",
  "aliases",
  "country",
  "city",
  "state_region",
  "type",
  "latitude",
  "longitude",
  "website_url",
  "publication_state",
] as const;

export const PRIVATE_CATALOG_FIELDS = [
  "counselor_remarks",
  "application_url",
  "contacts",
  "verified_by",
  "internal_notes",
] as const;

export interface CatalogPage {
  limit: number;
  offset: number;
}

export function catalogPageLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return CATALOG_PAGE_DEFAULT;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), CATALOG_PAGE_MAX);
}

export function catalogPageOffset(offset: number | undefined): number {
  if (offset === undefined || !Number.isFinite(offset) || offset < 0) {
    return 0;
  }

  return Math.trunc(offset);
}

export function catalogPage(
  limit: number | undefined,
  offset: number | undefined,
): CatalogPage {
  return {
    limit: catalogPageLimit(limit),
    offset: catalogPageOffset(offset),
  };
}

export function canTransitionCatalogState(
  from: CatalogPublicationState,
  to: CatalogPublicationState,
): boolean {
  if (from === to) {
    return false;
  }

  if (from === "draft") {
    return to === "in_review" || to === "withdrawn";
  }

  if (from === "in_review") {
    return to === "published" || to === "draft" || to === "withdrawn";
  }

  if (from === "published") {
    return to === "withdrawn" || to === "in_review";
  }

  return to === "draft";
}

export function isPublicUniversityField(field: string): boolean {
  return (PUBLIC_UNIVERSITY_FIELDS as readonly string[]).includes(field);
}

export function isPrivateCatalogField(field: string): boolean {
  return (PRIVATE_CATALOG_FIELDS as readonly string[]).includes(field);
}

export function isExcludedPublicField(field: string): boolean {
  return (EXCLUDED_PUBLIC_FIELDS as readonly string[]).includes(field);
}

export function publicCatalogFields(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};

  for (const key of Object.keys(row)) {
    if (isPrivateCatalogField(key) || isExcludedPublicField(key)) {
      continue;
    }

    next[key] = row[key];
  }

  return next;
}
