import type { GuestContext, RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

export async function createInvitationSql(
  context: RequestContext,
  args: {
    emailHash: string;
    tokenHash: string;
    role: string;
    scopes: string[];
    expiresAt: string;
    inviterEmailNormalized: string;
  },
): Promise<{ id: string; role: string; expiresAt: string }> {
  const row = await queryCommand<{
    payload: { id: string; role: string; expiresAt: string };
  }>(
    context,
    `SELECT commands.create_invitation($1, $2, $3, $4::text[], $5::timestamptz, $6) AS payload`,
    [
      args.emailHash,
      args.tokenHash,
      args.role,
      args.scopes,
      args.expiresAt,
      args.inviterEmailNormalized,
    ],
  );
  return row.payload;
}

export async function revokeInvitationSql(
  context: RequestContext,
  invitationId: string,
): Promise<void> {
  await queryCommand(
    context,
    `SELECT commands.revoke_invitation($1) AS payload`,
    [invitationId],
  );
}

export async function previewInvitationSql(
  context: RequestContext | GuestContext,
  tokenHash: string,
): Promise<{ id: string; role: string; expiresAt: string }> {
  const row = await queryCommand<{
    payload: { id: string; role: string; expiresAt: string };
  }>(
    context,
    `SELECT commands.preview_invitation($1) AS payload`,
    [tokenHash],
  );
  return row.payload;
}

export async function acceptInvitationSql(
  context: RequestContext,
  args: {
    tokenHash: string;
    emailHash: string;
    emailNormalized: string;
  },
): Promise<{ id: string; role: string; homeRole: string }> {
  const row = await queryCommand<{
    payload: { id: string; role: string; homeRole: string };
  }>(
    context,
    `SELECT commands.accept_invitation($1, $2, $3) AS payload`,
    [args.tokenHash, args.emailHash, args.emailNormalized],
  );
  return row.payload;
}

export async function createParentInvitationSql(
  context: RequestContext,
  args: {
    caseId: string;
    emailHash: string;
    tokenHash: string;
    scopes: string[];
  },
): Promise<{ id: string; caseId: string }> {
  const row = await queryCommand<{
    payload: { id: string; caseId: string };
  }>(
    context,
    `SELECT commands.create_parent_invitation($1, $2, $3, $4::text[]) AS payload`,
    [args.caseId, args.emailHash, args.tokenHash, args.scopes],
  );
  return row.payload;
}

export async function acceptParentInvitationSql(
  context: RequestContext,
  args: {
    tokenHash: string;
    emailHash: string;
    emailNormalized: string;
    kind: string;
  },
): Promise<{ id: string; linkId: string; status: string }> {
  const row = await queryCommand<{
    payload: { id: string; linkId: string; status: string };
  }>(
    context,
    `SELECT commands.accept_parent_invitation($1, $2, $3, $4) AS payload`,
    [args.tokenHash, args.emailHash, args.emailNormalized, args.kind],
  );
  return row.payload;
}

export async function grantStaffPermissionSql(
  context: RequestContext,
  args: {
    accountId: string;
    permission: string;
    expiresAt: string | null;
  },
): Promise<void> {
  await queryCommand(
    context,
    `SELECT commands.grant_staff_permission($1, $2, $3::timestamptz) AS payload`,
    [args.accountId, args.permission, args.expiresAt],
  );
}

export async function revokeStaffPermissionSql(
  context: RequestContext,
  args: { accountId: string; permission: string },
): Promise<void> {
  await queryCommand(
    context,
    `SELECT commands.revoke_staff_permission($1, $2) AS payload`,
    [args.accountId, args.permission],
  );
}

export async function replaceMfaRecoveryCodesSql(
  context: RequestContext,
  hashes: string[],
  emailNormalized: string,
): Promise<void> {
  await queryCommand(
    context,
    `SELECT commands.replace_mfa_recovery_codes($1::text[], $2) AS payload`,
    [hashes, emailNormalized],
  );
}

export async function consumeMfaRecoveryCodeSql(
  context: RequestContext,
  codeHash: string,
): Promise<boolean> {
  const row = await queryCommand<{ consumed: boolean }>(
    context,
    `SELECT commands.consume_mfa_recovery_code($1) AS consumed`,
    [codeHash],
  );
  return row.consumed;
}
