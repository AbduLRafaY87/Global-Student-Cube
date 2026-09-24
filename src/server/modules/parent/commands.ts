import { resolveRequestContext, type RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

export interface ParentFamilyLink {
  id: string;
  caseId: string;
  kind: string;
  status: string;
  revokedAt: string | null;
  studentName: string;
  studentDob: string | null;
  gscId: string | null;
  module2CompletedAt: string | null;
  module3CompletedAt: string | null;
  updatedAt: string | null;
  scopes: string[];
}

export interface ParentPendingInvitation {
  id: string;
  caseId: string;
  expiresAt: string;
  scopes: string[];
}

export interface ParentFamilyPayload {
  links: ParentFamilyLink[];
  pendingInvitations: ParentPendingInvitation[];
}

export async function loadParentFamilyOrNull(): Promise<ParentFamilyPayload | null> {
  try {
    const context = await resolveRequestContext();
    return await listParentFamilyCommand(context);
  } catch {
    return null;
  }
}

export async function listParentFamilyCommand(
  context: RequestContext,
): Promise<ParentFamilyPayload> {
  const row = await queryCommand<{ payload: ParentFamilyPayload }>(
    context,
    `SELECT commands.list_parent_family() AS payload`,
    [],
  );
  return row.payload;
}

export async function revokeParentLinkCommand(
  context: RequestContext,
  linkId: string,
): Promise<{ id: string; status: string }> {
  const row = await queryCommand<{ payload: { id: string; status: string } }>(
    context,
    `SELECT commands.revoke_parent_link($1) AS payload`,
    [linkId],
  );
  return row.payload;
}

export async function replaceParentLinkScopesCommand(
  context: RequestContext,
  linkId: string,
  scopes: string[],
): Promise<{ id: string; scopes: string[] }> {
  const row = await queryCommand<{ payload: { id: string; scopes: string[] } }>(
    context,
    `SELECT commands.replace_parent_link_scopes($1, $2::text[]) AS payload`,
    [linkId, scopes],
  );
  return row.payload;
}

export async function revokeParentInvitationCommand(
  context: RequestContext,
  invitationId: string,
): Promise<{ id: string; revoked: boolean }> {
  const row = await queryCommand<{ payload: { id: string; revoked: boolean } }>(
    context,
    `SELECT commands.revoke_parent_invitation($1) AS payload`,
    [invitationId],
  );
  return row.payload;
}

export async function createGuardianOperatedCaseCommand(
  context: RequestContext,
  input: { studentName: string; studentDob: string },
): Promise<{ caseId: string; linkId: string; status: string }> {
  const row = await queryCommand<{
    payload: { caseId: string; linkId: string; status: string };
  }>(
    context,
    `SELECT commands.create_guardian_operated_case($1, $2::date) AS payload`,
    [input.studentName, input.studentDob],
  );
  return row.payload;
}

export async function createParentInvitationByIdentifierCommand(
  context: RequestContext,
  input: {
    caseId: string;
    identifier: string;
    tokenHash: string;
    scopes: string[];
  },
): Promise<{ id: string; caseId: string; notifyEmail: string | null }> {
  const row = await queryCommand<{
    payload: { id: string; caseId: string; notifyEmail: string | null };
  }>(
    context,
    `SELECT commands.create_parent_invitation_by_identifier($1, $2, $3, $4::text[]) AS payload`,
    [input.caseId, input.identifier, input.tokenHash, input.scopes],
  );
  return row.payload;
}
