export const INGESTION_SOURCE_TYPES = [
  "official_url",
  "licensed_feed",
  "manual_sourced_entry",
] as const;

export type IngestionSourceType = (typeof INGESTION_SOURCE_TYPES)[number];

export const IMPORT_REQUIRED_COLUMNS = [
  "entity_type",
  "field_path",
  "value",
  "official_url",
  "retrieved_at",
  "content_hash",
  "excerpt",
  "source_type",
  "next_review_at",
] as const;

export type ImportRequiredColumn = (typeof IMPORT_REQUIRED_COLUMNS)[number];

export interface CatalogImportRow {
  entity_type?: unknown;
  entity_id?: unknown;
  field_path?: unknown;
  value?: unknown;
  official_url?: unknown;
  retrieved_at?: unknown;
  content_hash?: unknown;
  excerpt?: unknown;
  source_type?: unknown;
  next_review_at?: unknown;
}

export interface ImportRowReport {
  index: number;
  accepted: boolean;
  reason: string | null;
}

const PRIVATE_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

export function isIngestionSourceType(value: string): value is IngestionSourceType {
  return (INGESTION_SOURCE_TYPES as readonly string[]).includes(value);
}

export function isBlockedCatalogHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (PRIVATE_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return true;
  }

  if (host === "metadata.google.internal") {
    return true;
  }

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const octets = ipv4.slice(1).map((part) => Number(part));
    if (octets.some((octet) => octet > 255)) {
      return true;
    }
    const [a, b] = octets;
    if (a === 10 || a === 127 || a === 0) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    if (a === 192 && b === 168) {
      return true;
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }
  }

  return false;
}

export function parsePublicHttpUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  if (isBlockedCatalogHost(parsed.hostname)) {
    return null;
  }

  return parsed;
}

export function missingImportColumns(row: CatalogImportRow): ImportRequiredColumn[] {
  return IMPORT_REQUIRED_COLUMNS.filter((column) => {
    const value = row[column];
    return typeof value !== "string" || value.trim() === "";
  });
}

export function reportImportRows(rows: CatalogImportRow[]): ImportRowReport[] {
  return rows.map((row, index) => {
    const missing = missingImportColumns(row);
    if (missing.length > 0) {
      return {
        index,
        accepted: false,
        reason: `Missing provenance: ${missing.join(", ")}. The row was rejected, not guessed.`,
      };
    }

    const url = typeof row.official_url === "string" ? parsePublicHttpUrl(row.official_url) : null;
    if (!url) {
      return {
        index,
        accepted: false,
        reason: "official_url is not an allowable public http(s) URL.",
      };
    }

    if (
      typeof row.entity_type !== "string" ||
      ![
        "university",
        "program",
        "scholarship",
        "accommodation",
        "country_guidance",
      ].includes(row.entity_type)
    ) {
      return {
        index,
        accepted: false,
        reason: "entity_type is not a catalog entity.",
      };
    }

    return { index, accepted: true, reason: null };
  });
}

export function importsNeverAutoPublish(): true {
  return true;
}
