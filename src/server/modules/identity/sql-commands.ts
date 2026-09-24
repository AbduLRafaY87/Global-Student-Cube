import type { GuestContext, RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

export async function registerStudentAccountSql(
  context: RequestContext,
  args: {
    accountId: string;
    emailNormalized: string;
    fullName: string;
    familyName: string;
    parentSpouseName: string | null;
    gender: string;
    dob: string;
    nationality: string;
    residenceCountry: string;
    city: string;
    address: unknown;
    phoneCipher: Buffer;
    phoneHash: string;
    whatsappCipher: Buffer | null;
    socialUrls: unknown;
    passportStatus: string | null;
    ageBand: string;
    policyVersion: string;
    evidenceHash: string;
    consentEmail: boolean;
    consentWhatsapp: boolean;
  },
): Promise<void> {
  await queryCommand(
    context,
    `SELECT commands.register_student_account(
      $1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11::jsonb,
      $12, $13, $14, $15::jsonb, $16, $17, $18, $19, $20, $21
    ) AS payload`,
    [
      args.accountId,
      args.emailNormalized,
      args.fullName,
      args.familyName,
      args.parentSpouseName,
      args.gender,
      args.dob,
      args.nationality,
      args.residenceCountry,
      args.city,
      JSON.stringify(args.address),
      args.phoneCipher,
      args.phoneHash,
      args.whatsappCipher,
      JSON.stringify(args.socialUrls),
      args.passportStatus,
      args.ageBand,
      args.policyVersion,
      args.evidenceHash,
      args.consentEmail,
      args.consentWhatsapp,
    ],
  );
}

export async function activateAfterEmailVerifiedSql(
  context: RequestContext,
  accountId: string,
): Promise<string> {
  const row = await queryCommand<{ status: string }>(
    context,
    `SELECT commands.activate_after_email_verified($1) AS status`,
    [accountId],
  );
  return row.status;
}

export async function bumpAbuseSql(
  context: GuestContext | RequestContext,
  keyHash: string,
  windowSeconds: number,
  limit: number,
): Promise<{ allowed: boolean; retry_after_seconds: number }> {
  const row = await queryCommand<{
    payload: { allowed: boolean; retry_after_seconds: number };
  }>(
    context,
    `SELECT commands.bump_abuse($1, $2, $3) AS payload`,
    [keyHash, windowSeconds, limit],
  );
  return row.payload;
}

export async function consumeResetTokenSql(
  context: RequestContext,
  tokenHash: string,
  accountId: string,
): Promise<boolean> {
  const row = await queryCommand<{ consumed: boolean }>(
    context,
    `SELECT commands.consume_reset_token($1, $2) AS consumed`,
    [tokenHash, accountId],
  );
  return row.consumed;
}
