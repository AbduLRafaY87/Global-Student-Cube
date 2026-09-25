import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

interface JsonPayload {
  payload: Record<string, unknown>;
}

export async function learningHomeSql(
  context: RequestContext,
  category: string,
  audience: string,
  search: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.learning_home($1, $2, $3) AS payload`,
    [category, audience, search],
  );
  return row.payload;
}

export async function getLearningCourseSql(
  context: RequestContext,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.get_learning_course($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function saveLearningProgressSql(
  context: RequestContext,
  courseId: string,
  lessonId: string,
  position: number,
  complete: boolean,
  reset: boolean,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.save_learning_progress($1::uuid, $2::uuid, $3, $4, $5) AS payload`,
    [courseId, lessonId, position, complete, reset],
  );
  return row.payload;
}

export async function listLearningLibrarySql(
  context: RequestContext,
  search: string,
  category: string,
  fileType: string,
): Promise<unknown[]> {
  const row = await queryCommand<{ payload: unknown[] }>(
    context,
    `SELECT commands.list_learning_library($1, $2, $3) AS payload`,
    [search, category, fileType],
  );
  return Array.isArray(row.payload) ? row.payload : [];
}

export async function getLearningResourceSql(
  context: RequestContext,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.get_learning_resource($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function saveLearningResourceSql(
  context: RequestContext,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.save_learning_resource($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function listAdminContentSql(
  context: RequestContext,
  kind: string,
  state: string,
): Promise<unknown[]> {
  const row = await queryCommand<{ payload: unknown[] }>(
    context,
    `SELECT commands.list_admin_content($1, $2) AS payload`,
    [kind, state],
  );
  return Array.isArray(row.payload) ? row.payload : [];
}

export async function getAdminContentSql(
  context: RequestContext,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.get_admin_content($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function upsertContentSql(
  context: RequestContext,
  values: {
    id: string | null;
    kind: string;
    title: string;
    topic: string;
    category: string;
    audience: string;
    summary: string;
    body: string;
    author: string;
    instructor: string | null;
    duration: number | null;
    sourceUrls: string[];
    captions: string;
    transcript: string;
    mediaUrl: string;
    libraryType: string;
    eventInformation: string;
    namedConsent: boolean;
    consentEvidence: string;
    universitySupplied: boolean;
    provenanceVerified: boolean;
    scheduledAt: string | null;
  },
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.upsert_content_item(
      $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22::timestamptz
    ) AS payload`,
    [
      values.id,
      values.kind,
      values.title,
      values.topic,
      values.category,
      values.audience,
      values.summary,
      values.body,
      values.author,
      values.instructor,
      values.duration,
      values.sourceUrls,
      values.captions,
      values.transcript,
      values.mediaUrl,
      values.libraryType,
      values.eventInformation,
      values.namedConsent,
      values.consentEvidence,
      values.universitySupplied,
      values.provenanceVerified,
      values.scheduledAt,
    ],
  );
  return row.payload;
}

export async function upsertLessonSql(
  context: RequestContext,
  values: {
    id: string | null;
    courseId: string;
    sort: number;
    title: string;
    body: string;
    format: string;
    duration: number | null;
    captions: string;
    transcript: string;
    mediaUrl: string;
  },
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.upsert_learning_lesson(
      $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10
    ) AS payload`,
    [
      values.id,
      values.courseId,
      values.sort,
      values.title,
      values.body,
      values.format,
      values.duration,
      values.captions,
      values.transcript,
      values.mediaUrl,
    ],
  );
  return row.payload;
}

export async function decideContentSql(
  context: RequestContext,
  id: string,
  next: string,
  reason: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.decide_content_item($1::uuid, $2, $3) AS payload`,
    [id, next, reason],
  );
  return row.payload;
}
