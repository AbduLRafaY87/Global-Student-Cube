export const EXPORT_TTL_HOURS = 24;
export const DELETION_WORKFLOW_DAYS = 30;

export const EXPORT_EXCLUDED_COLLECTIONS = [
  "private_notes",
  "safety_evidence",
  "other_participant_records",
] as const;

export interface ExportRecord {
  collection: string;
  ownerAccountId: string;
  subjectAccountId: string | null;
  confidentialToOther: boolean;
  isProtectedSafety: boolean;
}

export interface ExportPackage {
  accountId: string;
  records: ExportRecord[];
  excludedCollections: readonly string[];
  expiresAt: string;
}

export function exportIncludesRecord(
  accountId: string,
  record: ExportRecord,
): boolean {
  if (record.confidentialToOther || record.isProtectedSafety) {
    return false;
  }
  if (EXPORT_EXCLUDED_COLLECTIONS.includes(
    record.collection as (typeof EXPORT_EXCLUDED_COLLECTIONS)[number],
  )) {
    return false;
  }
  return record.ownerAccountId === accountId;
}

export function buildExportPackage(
  accountId: string,
  candidates: readonly ExportRecord[],
  now: string,
): ExportPackage {
  const expires = new Date(Date.parse(now) + EXPORT_TTL_HOURS * 3_600_000);
  return {
    accountId,
    records: candidates.filter((record) => exportIncludesRecord(accountId, record)),
    excludedCollections: EXPORT_EXCLUDED_COLLECTIONS,
    expiresAt: expires.toISOString(),
  };
}

export function exportContainsOnlySubject(
  accountId: string,
  pkg: ExportPackage,
): boolean {
  return (
    pkg.accountId === accountId &&
    pkg.records.every((record) => exportIncludesRecord(accountId, record))
  );
}

export function recordingConsentWithdrawalDeletesAccount(): boolean {
  return false;
}
