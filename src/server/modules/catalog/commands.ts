import type { CatalogEntityType, CatalogPublicationState } from "@/domain/catalog/catalog";
import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

interface PayloadRow<T> {
  payload: T;
}

export async function setCatalogPublicationStateCommand(
  context: RequestContext,
  input: {
    entityType: CatalogEntityType;
    entityId: string;
    nextState: CatalogPublicationState;
    reason: string;
  },
): Promise<{ id: string; state: string; revision: number | null }> {
  const row = await queryCommand<
    PayloadRow<{ id: string; state: string; revision: number | null }>
  >(
    context,
    `SELECT commands.set_catalog_publication_state($1, $2, $3, $4) AS payload`,
    [input.entityType, input.entityId, input.nextState, input.reason],
  );
  return row.payload;
}

export async function submitCatalogIngestionCommand(
  context: RequestContext,
  input: {
    sourceType: string;
    canonicalUrl: string;
    officialHost: string;
    path: string;
    permissionBasis: string;
    licenseRef: string | null;
    entityType: string;
    entityId: string | null;
    reviewOwner: string | null;
    retrievedAt: string | null;
    contentHash: string | null;
    excerpt: string | null;
    proposedFields: Record<string, unknown>;
    reason: string;
  },
): Promise<{ id: string; status: string; documentId: string }> {
  const row = await queryCommand<
    PayloadRow<{ id: string; status: string; documentId: string }>
  >(
    context,
    `SELECT commands.submit_catalog_ingestion($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) AS payload`,
    [
      input.sourceType,
      input.canonicalUrl,
      input.officialHost,
      input.path,
      input.permissionBasis,
      input.licenseRef,
      input.entityType,
      input.entityId,
      input.reviewOwner,
      input.retrievedAt,
      input.contentHash,
      input.excerpt,
      JSON.stringify(input.proposedFields),
      input.reason,
    ],
  );
  return row.payload;
}

export async function reviewCatalogIngestionCommand(
  context: RequestContext,
  input: {
    jobId: string;
    decisions: Array<{ fieldPath: string; decision: "accepted" | "rejected" }>;
    nextReviewAt: string | null;
    reason: string;
  },
): Promise<{ id: string; status: string; published: boolean }> {
  const row = await queryCommand<
    PayloadRow<{ id: string; status: string; published: boolean }>
  >(
    context,
    `SELECT commands.review_catalog_ingestion($1, $2::jsonb, $3, $4) AS payload`,
    [
      input.jobId,
      JSON.stringify(input.decisions),
      input.nextReviewAt,
      input.reason,
    ],
  );
  return row.payload;
}

export async function rejectCatalogIngestionCommand(
  context: RequestContext,
  input: { jobId: string; reason: string },
): Promise<{ id: string; status: string }> {
  const row = await queryCommand<PayloadRow<{ id: string; status: string }>>(
    context,
    `SELECT commands.reject_catalog_ingestion($1, $2) AS payload`,
    [input.jobId, input.reason],
  );
  return row.payload;
}

export async function importCatalogRowsCommand(
  context: RequestContext,
  input: {
    kind: "csv" | "json";
    rows: unknown[];
    dryRun: boolean;
    reason: string;
  },
): Promise<{
  id: string;
  dryRun: boolean;
  accepted: number;
  rejected: number;
  published: boolean;
}> {
  const row = await queryCommand<
    PayloadRow<{
      id: string;
      dryRun: boolean;
      accepted: number;
      rejected: number;
      published: boolean;
    }>
  >(
    context,
    `SELECT commands.import_catalog_rows($1, $2::jsonb, $3, $4) AS payload`,
    [input.kind, JSON.stringify(input.rows), input.dryRun, input.reason],
  );
  return row.payload;
}

export async function listCatalogEntitiesCommand(
  context: RequestContext,
  input: {
    kind: string | null;
    country: string | null;
    state: string | null;
    reviewDue: boolean;
    limit: number;
    offset: number;
  },
): Promise<{ items: CatalogEntityListItem[]; limit: number; offset: number }> {
  const row = await queryCommand<
    PayloadRow<{ items: CatalogEntityListItem[]; limit: number; offset: number }>
  >(
    context,
    `SELECT commands.list_catalog_entities($1, $2, $3, $4, $5, $6) AS payload`,
    [
      input.kind,
      input.country,
      input.state,
      input.reviewDue,
      input.limit,
      input.offset,
    ],
  );
  return row.payload;
}

export async function listCatalogReviewDueCommand(
  context: RequestContext,
  limit: number,
  offset: number,
): Promise<{ items: CatalogReviewDueItem[]; limit: number; offset: number }> {
  const row = await queryCommand<
    PayloadRow<{ items: CatalogReviewDueItem[]; limit: number; offset: number }>
  >(
    context,
    `SELECT commands.list_catalog_review_due($1, $2) AS payload`,
    [limit, offset],
  );
  return row.payload;
}

export async function getCatalogIngestionJobCommand(
  context: RequestContext,
  id: string,
): Promise<CatalogIngestionDetail> {
  const row = await queryCommand<PayloadRow<CatalogIngestionDetail>>(
    context,
    `SELECT commands.get_catalog_ingestion_job($1) AS payload`,
    [id],
  );
  return row.payload;
}

export async function getCatalogUniversityCommand(
  context: RequestContext,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.get_catalog_university($1) AS payload`,
    [id],
  );
  return row.payload;
}

export async function getCatalogProgramCommand(
  context: RequestContext,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.get_catalog_program($1) AS payload`,
    [id],
  );
  return row.payload;
}

export async function getCatalogScholarshipCommand(
  context: RequestContext,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.get_catalog_scholarship($1) AS payload`,
    [id],
  );
  return row.payload;
}

export async function upsertUniversityCommand(
  context: RequestContext,
  input: {
    id: string | null;
    name: string;
    slug: string | null;
    country: string;
    city: string | null;
    type: string | null;
    websiteUrl: string | null;
    aliases: string[];
    reason: string;
  },
): Promise<{ id: string }> {
  const row = await queryCommand<PayloadRow<{ id: string }>>(
    context,
    `SELECT commands.upsert_university($1,$2,$3,$4,$5,$6,$7,$8,$9) AS payload`,
    [
      input.id,
      input.name,
      input.slug,
      input.country,
      input.city,
      input.type,
      input.websiteUrl,
      input.aliases,
      input.reason,
    ],
  );
  return row.payload;
}

export async function upsertProgramCommand(
  context: RequestContext,
  input: {
    id: string | null;
    universityId: string;
    name: string;
    level: string;
    fieldId: string;
    durationValue: number;
    durationUnit: string;
    studyModes: string[];
    generalUrl: string | null;
    internationalRatio: number | null;
    reason: string;
  },
): Promise<{ id: string }> {
  const row = await queryCommand<PayloadRow<{ id: string }>>(
    context,
    `SELECT commands.upsert_program($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) AS payload`,
    [
      input.id,
      input.universityId,
      input.name,
      input.level,
      input.fieldId,
      input.durationValue,
      input.durationUnit,
      input.studyModes,
      input.generalUrl,
      input.internationalRatio,
      input.reason,
    ],
  );
  return row.payload;
}

export async function upsertProgramCostCommand(
  context: RequestContext,
  input: {
    programId: string;
    academicYear: string;
    feeBasis: string;
    amount: number;
    currency: string;
    residencyCategory: string | null;
    sourceFactId: string;
    reason: string;
  },
): Promise<{ id: string }> {
  const row = await queryCommand<PayloadRow<{ id: string }>>(
    context,
    `SELECT commands.upsert_program_cost($1,$2,$3,$4,$5,$6,$7,$8) AS payload`,
    [
      input.programId,
      input.academicYear,
      input.feeBasis,
      input.amount,
      input.currency,
      input.residencyCategory,
      input.sourceFactId,
      input.reason,
    ],
  );
  return row.payload;
}

export async function upsertProgramIntakeCommand(
  context: RequestContext,
  input: {
    programId: string;
    intakeYear: number;
    intakeMonth: number | null;
    deadlinePrecision: string;
    deadlineDate: string | null;
    deadlineMonth: number | null;
    reason: string;
  },
): Promise<{ id: string }> {
  const row = await queryCommand<PayloadRow<{ id: string }>>(
    context,
    `SELECT commands.upsert_program_intake($1,$2,$3,$4,$5,$6,$7) AS payload`,
    [
      input.programId,
      input.intakeYear,
      input.intakeMonth,
      input.deadlinePrecision,
      input.deadlineDate,
      input.deadlineMonth,
      input.reason,
    ],
  );
  return row.payload;
}

export async function upsertProgramActionLinkCommand(
  context: RequestContext,
  input: { programId: string; applicationUrl: string; reason: string },
): Promise<{ programId: string }> {
  const row = await queryCommand<PayloadRow<{ programId: string }>>(
    context,
    `SELECT commands.upsert_program_action_link($1, $2, $3) AS payload`,
    [input.programId, input.applicationUrl, input.reason],
  );
  return row.payload;
}

export async function upsertEntryCriterionCommand(
  context: RequestContext,
  input: {
    programId: string;
    criterionKey: string;
    kind: string;
    requirement: Record<string, unknown>;
    mandatory: boolean;
    weight: number | null;
    reason: string;
  },
): Promise<{ id: string; revision: number }> {
  const row = await queryCommand<PayloadRow<{ id: string; revision: number }>>(
    context,
    `SELECT commands.upsert_entry_criterion($1,$2,$3,$4::jsonb,$5,$6,$7) AS payload`,
    [
      input.programId,
      input.criterionKey,
      input.kind,
      JSON.stringify(input.requirement),
      input.mandatory,
      input.weight,
      input.reason,
    ],
  );
  return row.payload;
}

export async function upsertAccommodationCommand(
  context: RequestContext,
  input: {
    id: string | null;
    universityId: string;
    name: string;
    type: string;
    amount: number | null;
    currency: string | null;
    basis: string;
    reason: string;
  },
): Promise<{ id: string }> {
  const row = await queryCommand<PayloadRow<{ id: string }>>(
    context,
    `SELECT commands.upsert_accommodation($1,$2,$3,$4,$5,$6,$7,$8) AS payload`,
    [
      input.id,
      input.universityId,
      input.name,
      input.type,
      input.amount,
      input.currency,
      input.basis,
      input.reason,
    ],
  );
  return row.payload;
}

export async function upsertScholarshipCommand(
  context: RequestContext,
  input: {
    id: string | null;
    name: string;
    providerName: string;
    officialUrl: string;
    providerType: string;
    countryCodes: string[];
    levels: string[];
    fieldIds: string[];
    availability: string;
    deadlinePrecision: string;
    deadlineDate: string | null;
    deadlineMonth: number | null;
    reason: string;
  },
): Promise<{ id: string }> {
  const row = await queryCommand<PayloadRow<{ id: string }>>(
    context,
    `SELECT commands.upsert_scholarship($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) AS payload`,
    [
      input.id,
      input.name,
      input.providerName,
      input.officialUrl,
      input.providerType,
      input.countryCodes,
      input.levels,
      input.fieldIds,
      input.availability,
      input.deadlinePrecision,
      input.deadlineDate,
      input.deadlineMonth,
      input.reason,
    ],
  );
  return row.payload;
}

export async function upsertSourceDocumentCommand(
  context: RequestContext,
  input: {
    canonicalUrl: string;
    officialHost: string;
    retrievedAt: string;
    contentHash: string;
    excerpt: string | null;
    permissionBasis: string;
    method: string;
    reason: string;
  },
): Promise<{ id: string }> {
  const row = await queryCommand<PayloadRow<{ id: string }>>(
    context,
    `SELECT commands.upsert_source_document($1,$2,$3,$4,$5,$6,$7,$8) AS payload`,
    [
      input.canonicalUrl,
      input.officialHost,
      input.retrievedAt,
      input.contentHash,
      input.excerpt,
      input.permissionBasis,
      input.method,
      input.reason,
    ],
  );
  return row.payload;
}

export async function upsertSourceFactCommand(
  context: RequestContext,
  input: {
    documentId: string;
    entityType: string;
    entityId: string;
    fieldPath: string;
    valueJson: unknown;
    excerpt: string | null;
    sourceType: string;
    nextReviewAt: string;
    reason: string;
  },
): Promise<{ id: string }> {
  const row = await queryCommand<PayloadRow<{ id: string }>>(
    context,
    `SELECT commands.upsert_source_fact($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9) AS payload`,
    [
      input.documentId,
      input.entityType,
      input.entityId,
      input.fieldPath,
      JSON.stringify(input.valueJson),
      input.excerpt,
      input.sourceType,
      input.nextReviewAt,
      input.reason,
    ],
  );
  return row.payload;
}

export interface CatalogEntityListItem {
  id: string;
  name: string;
  type: string;
  status: string;
  review_due: string | null;
  parent_id?: string | null;
}

export interface CatalogReviewDueItem {
  entity_type: string;
  entity_id: string;
  field_path: string;
  next_review_at: string;
  verified_at: string | null;
}

export interface CatalogIngestionDetail {
  job: {
    id: string;
    source_type: string;
    canonical_url: string;
    official_host: string;
    entity_type: string;
    entity_id: string | null;
    status: string;
    retrieved_at: string | null;
    content_hash: string | null;
    excerpt: string | null;
    version: number;
  };
  fields: Array<{
    id: string;
    field_path: string;
    current_value: unknown;
    proposed_value: unknown;
    excerpt: string | null;
    decision: string;
  }>;
}
