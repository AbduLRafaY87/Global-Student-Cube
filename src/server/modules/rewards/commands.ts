import type { GuestContext, RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

type Ctx = RequestContext | GuestContext;

interface JsonPayload {
  payload: Record<string, unknown>;
}

export async function rewardHomeSql(
  context: RequestContext,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.reward_home() AS payload`,
  );
  return row.payload;
}

export async function listRewardCatalogSql(
  context: RequestContext,
  giftCards: boolean,
): Promise<unknown[]> {
  const row = await queryCommand<{ payload: unknown[] }>(
    context,
    `SELECT commands.list_reward_catalog($1) AS payload`,
    [giftCards],
  );
  return Array.isArray(row.payload) ? row.payload : [];
}

export async function createRedemptionSql(
  context: RequestContext,
  catalogCode: string,
  giftCards: boolean,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.create_redemption($1, $2) AS payload`,
    [catalogCode, giftCards],
  );
  return row.payload;
}

export async function getRedemptionSql(
  context: RequestContext,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.get_redemption($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function listMyRedemptionsSql(
  context: RequestContext,
): Promise<unknown[]> {
  const row = await queryCommand<{ payload: unknown[] }>(
    context,
    `SELECT commands.list_my_redemptions() AS payload`,
  );
  return Array.isArray(row.payload) ? row.payload : [];
}

export async function issueReferralCodeSql(
  context: RequestContext,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.issue_referral_code() AS payload`,
  );
  return row.payload;
}

export async function visitReferralSql(
  context: Ctx,
  code: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.visit_referral($1) AS payload`,
    [code],
  );
  return row.payload;
}

export async function attributeReferralSql(
  context: Ctx,
  code: string,
  invitee: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.attribute_referral($1, $2::uuid) AS payload`,
    [code, invitee],
  );
  return row.payload;
}

export async function listMyReferralsSql(
  context: RequestContext,
): Promise<unknown[]> {
  const row = await queryCommand<{ payload: unknown[] }>(
    context,
    `SELECT commands.list_my_referrals() AS payload`,
  );
  return Array.isArray(row.payload) ? row.payload : [];
}

export async function listMyCertificatesSql(
  context: RequestContext,
): Promise<unknown[]> {
  const row = await queryCommand<{ payload: unknown[] }>(
    context,
    `SELECT commands.list_my_certificates() AS payload`,
  );
  return Array.isArray(row.payload) ? row.payload : [];
}

export async function getCertificateSql(
  context: RequestContext,
  id: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.get_certificate($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function adminRewardsQueueSql(
  context: RequestContext,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.admin_rewards_queue() AS payload`,
  );
  return row.payload;
}

export async function approveMentoringActivitySql(
  context: RequestContext,
  logId: string,
  reason: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.approve_mentoring_activity($1::uuid, $2) AS payload`,
    [logId, reason],
  );
  return row.payload;
}

export async function decideRedemptionSql(
  context: RequestContext,
  id: string,
  decision: string,
  reason: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.decide_redemption($1::uuid, $2, $3) AS payload`,
    [id, decision, reason],
  );
  return row.payload;
}

export async function publishRewardSql(
  context: RequestContext,
  id: string,
  reason: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.publish_reward($1::uuid, $2) AS payload`,
    [id, reason],
  );
  return row.payload;
}

export async function workerTickRewardsSql(
  context: GuestContext,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.worker_tick_rewards() AS payload`,
  );
  return row.payload;
}
