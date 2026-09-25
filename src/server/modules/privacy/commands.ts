import type { GuestContext, RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

type Ctx = RequestContext | GuestContext;

interface PayloadRow<T> {
  payload: T;
}

export async function myAccountSettingsCommand(context: RequestContext) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.my_account_settings() AS payload`,
  );
  return row.payload;
}

export async function listMyConsentsCommand(context: RequestContext) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.list_my_consents() AS payload`,
  );
  return row.payload;
}

export async function listMyDataRequestsCommand(context: RequestContext) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.list_my_data_requests() AS payload`,
  );
  return row.payload;
}

export async function createDataRequestCommand(
  context: RequestContext,
  accountId: string,
  kind: string,
  reason: string,
) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.create_data_request($1::uuid, $2, $3) AS payload`,
    [accountId, kind, reason],
  );
  return row.payload;
}

export async function getDataRequestCommand(context: RequestContext, id: string) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.get_data_request($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function processDeletionCommand(context: RequestContext, id: string) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.process_deletion_request($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function placeLegalHoldCommand(
  context: RequestContext,
  resourceType: string,
  resourceId: string,
  reason: string,
  reviewAt: string,
) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.place_legal_hold($1, $2::uuid, $3, $4::timestamptz) AS payload`,
    [resourceType, resourceId, reason, reviewAt],
  );
  return row.payload;
}

export async function startPhoneChallengeCommand(
  context: RequestContext,
  phoneHash: string,
  codeHash: string | null,
  provider: string,
  providerSid: string | null,
) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.start_phone_challenge($1, $2, $3, $4) AS payload`,
    [phoneHash, codeHash, provider, providerSid],
  );
  return row.payload;
}

export async function verifyPhoneChallengeCommand(
  context: RequestContext,
  challengeId: string,
  codeHash: string,
) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.verify_phone_challenge($1::uuid, $2) AS payload`,
    [challengeId, codeHash],
  );
  return row.payload;
}

export async function recordPhoneChallengeFailureCommand(
  context: RequestContext,
  challengeId: string,
) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.record_phone_challenge_failure($1::uuid) AS payload`,
    [challengeId],
  );
  return row.payload;
}

export async function confirmTwilioPhoneCommand(
  context: RequestContext,
  challengeId: string,
) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.confirm_twilio_phone_challenge($1::uuid) AS payload`,
    [challengeId],
  );
  return row.payload;
}

export async function submitSupportRequestCommand(
  context: Ctx,
  input: {
    category: string;
    description: string;
    replyChannel: string | null;
    isSafety: boolean;
    subjectId: string | null;
  },
) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.submit_support_request($1, $2, $3, $4, $5::uuid) AS payload`,
    [
      input.category,
      input.description,
      input.replyChannel,
      input.isSafety,
      input.subjectId,
    ],
  );
  return row.payload;
}

export async function listMySupportRequestsCommand(context: RequestContext) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.list_my_support_requests() AS payload`,
  );
  return row.payload;
}

export async function getSupportRequestCommand(context: RequestContext, id: string) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.get_support_request($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function adminAnalyticsCommand(
  context: RequestContext,
  from: string | null,
  to: string | null,
) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.admin_operational_analytics($1::timestamptz, $2::timestamptz) AS payload`,
    [from, to],
  );
  return row.payload;
}

export async function listSecurityEventsCommand(context: RequestContext) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.list_security_events() AS payload`,
  );
  return row.payload;
}
