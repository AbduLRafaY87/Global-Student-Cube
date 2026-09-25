import type { GuestContext, RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

type Ctx = RequestContext | GuestContext;

interface JsonPayload {
  payload: Record<string, unknown>;
}

export async function newsFeedSql(
  context: Ctx,
  tab: string,
  topic: string,
  search: string,
  page: number,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.news_feed($1, $2, $3, $4) AS payload`,
    [tab, topic, search, page],
  );
  return row.payload;
}

export async function getNewsArticleSql(
  context: Ctx,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.get_news_article($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function toggleEngagementSql(
  context: RequestContext,
  id: string,
  kind: string,
  enabled: boolean,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.toggle_news_engagement($1::uuid, $2, $3) AS payload`,
    [id, kind, enabled],
  );
  return row.payload;
}

export async function followTopicSql(
  context: RequestContext,
  topic: string,
  enabled: boolean,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.follow_news_topic($1, $2) AS payload`,
    [topic, enabled],
  );
  return row.payload;
}

export async function upsertCounselorNewsSql(
  context: RequestContext,
  values: {
    id: string | null;
    title: string;
    summary: string;
    topic: string;
    body: string;
    sourceUrl: string;
    relatedUniversityId: string | null;
    relatedScholarshipId: string | null;
    captions: string;
    rightsDeclaration: string;
    submit: boolean;
  },
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.upsert_counselor_news(
      $1::uuid, $2, $3, $4, $5, $6, $7::uuid, $8::uuid, $9, $10, $11
    ) AS payload`,
    [
      values.id,
      values.title,
      values.summary,
      values.topic,
      values.body,
      values.sourceUrl,
      values.relatedUniversityId,
      values.relatedScholarshipId,
      values.captions,
      values.rightsDeclaration,
      values.submit,
    ],
  );
  return row.payload;
}

export async function listCounselorNewsSql(
  context: RequestContext,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.list_counselor_news() AS payload`,
    [],
  );
  return row.payload;
}

export async function submitStorySql(
  context: RequestContext,
  values: {
    id: string | null;
    title: string;
    body: string;
    country: string;
    topic: string;
    publicationConsent: boolean;
    nameConsent: boolean;
    imageConsent: boolean;
    spotlightConsent: boolean;
    mentorNamed: boolean;
    mentorConsent: boolean;
    parentNamed: boolean;
    parentConsent: boolean;
    submit: boolean;
  },
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.submit_success_story(
      $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    ) AS payload`,
    [
      values.id,
      values.title,
      values.body,
      values.country,
      values.topic,
      values.publicationConsent,
      values.nameConsent,
      values.imageConsent,
      values.spotlightConsent,
      values.mentorNamed,
      values.mentorConsent,
      values.parentNamed,
      values.parentConsent,
      values.submit,
    ],
  );
  return row.payload;
}

export async function withdrawStorySql(
  context: RequestContext,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.withdraw_success_story($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function listPublicStoriesSql(
  context: Ctx,
  country: string,
  topic: string,
  search: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.list_public_stories($1, $2, $3) AS payload`,
    [country, topic, search],
  );
  return row.payload;
}

export async function getPublicStorySql(
  context: Ctx,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.get_public_story($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function listModerationSql(
  context: RequestContext,
  queue: string,
  severity: string,
  status: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.list_moderation_queue($1, $2, $3) AS payload`,
    [queue, severity, status],
  );
  return row.payload;
}

export async function getModerationSql(
  context: RequestContext,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.get_moderation_review($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function decideModerationSql(
  context: RequestContext,
  id: string,
  decision: string,
  response: string,
  notes: string,
  reason: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.decide_moderation($1::uuid, $2, $3, $4, $5) AS payload`,
    [id, decision, response, notes, reason],
  );
  return row.payload;
}
