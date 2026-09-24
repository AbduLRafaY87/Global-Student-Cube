import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

interface PayloadRow<T> {
  payload: T;
}

export interface AdminQueueView {
  id: string;
  label: string;
  href: string;
  count: number;
}

export interface AdminAuditRow {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  occurred_at: string;
  reason: string | null;
  safe_diff?: Record<string, unknown>;
}

export interface AdminOverviewPayload {
  homeRole: string;
  permissions: string[];
  queues: AdminQueueView[];
  recentAudit: AdminAuditRow[];
}

export interface VerificationQueueItem {
  id: string;
  account_id: string;
  state: string;
  version: number;
  submitted_at: string;
  escalates_at: string;
  assigned_to: string | null;
  kind: string;
  email_normalized: string;
  gsc_id: string | null;
  account_status: string;
  escalation_due: boolean;
}

export interface VerificationCaseDetail {
  id: string;
  accountId: string;
  state: string;
  version: number;
  submittedAt: string;
  escalatesAt: string;
  assignedTo: string | null;
  kind: string;
  emailNormalized: string;
  gscId: string | null;
  accountStatus: string;
  internalComment: string | null;
  hasCommunityDeclaration: boolean;
  evidence: {
    kind: string | null;
    parentLinkId: string | null;
    caseId: string | null;
    applicantMessage: string | null;
  };
  escalationDue: boolean;
}

export interface AdminUserListItem {
  id: string;
  email_normalized: string;
  status: string;
  gsc_id: string | null;
  version: number;
  updated_at: string;
  home_role: string;
  display_name: string | null;
}

export interface AdminUserDetail {
  id: string;
  emailNormalized: string;
  status: string;
  gscId: string | null;
  version: number;
  updatedAt: string;
  homeRole: string;
  displayName: string | null;
  roles: string[];
  permissions: string[];
  counselorAvailable: boolean;
}

export interface SupportRequestPayload {
  id: string;
  kind: string;
  status: string;
}

export async function listAdminOverviewSql(
  context: RequestContext,
): Promise<AdminOverviewPayload> {
  const row = await queryCommand<PayloadRow<AdminOverviewPayload>>(
    context,
    `SELECT commands.list_admin_overview() AS payload`,
  );
  return row.payload;
}

export async function listVerificationQueueSql(
  context: RequestContext,
  args: {
    kind: string | null;
    state: string | null;
    escalated: boolean;
    limit: number;
    offset: number;
  },
): Promise<{ items: VerificationQueueItem[]; limit: number; offset: number }> {
  const row = await queryCommand<
    PayloadRow<{ items: VerificationQueueItem[]; limit: number; offset: number }>
  >(
    context,
    `SELECT commands.list_verification_queue($1, $2, $3, $4, $5) AS payload`,
    [args.kind, args.state, args.escalated, args.limit, args.offset],
  );
  return row.payload;
}

export async function getVerificationCaseSql(
  context: RequestContext,
  caseId: string,
): Promise<VerificationCaseDetail> {
  const row = await queryCommand<PayloadRow<VerificationCaseDetail>>(
    context,
    `SELECT commands.get_verification_case($1) AS payload`,
    [caseId],
  );
  return row.payload;
}

export async function assignVerificationCaseSql(
  context: RequestContext,
  args: {
    caseId: string;
    reviewerId: string;
    reason: string;
    version: number;
  },
): Promise<{ id: string; version: number }> {
  const row = await queryCommand<PayloadRow<{ id: string; version: number }>>(
    context,
    `SELECT commands.assign_verification_case($1, $2, $3, $4) AS payload`,
    [args.caseId, args.reviewerId, args.reason, args.version],
  );
  return row.payload;
}

export async function commentVerificationCaseSql(
  context: RequestContext,
  args: { caseId: string; comment: string; version: number },
): Promise<{ id: string; version: number }> {
  const row = await queryCommand<PayloadRow<{ id: string; version: number }>>(
    context,
    `SELECT commands.comment_verification_case($1, $2, $3) AS payload`,
    [args.caseId, args.comment, args.version],
  );
  return row.payload;
}

export async function decideVerificationCaseSql(
  context: RequestContext,
  args: {
    caseId: string;
    decision: string;
    reason: string;
    applicantMessage: string | null;
    version: number;
  },
): Promise<{ id: string; state: string; version: number }> {
  const row = await queryCommand<
    PayloadRow<{ id: string; state: string; version: number }>
  >(
    context,
    `SELECT commands.decide_verification_case($1, $2, $3, $4, $5) AS payload`,
    [
      args.caseId,
      args.decision,
      args.reason,
      args.applicantMessage,
      args.version,
    ],
  );
  return row.payload;
}

export async function escalateVerificationCaseSql(
  context: RequestContext,
  args: { caseId: string; reason: string; version: number },
): Promise<{ id: string; version: number }> {
  const row = await queryCommand<PayloadRow<{ id: string; version: number }>>(
    context,
    `SELECT commands.escalate_verification_case($1, $2, $3) AS payload`,
    [args.caseId, args.reason, args.version],
  );
  return row.payload;
}

export async function searchAdminUsersSql(
  context: RequestContext,
  args: { query: string; limit: number; offset: number },
): Promise<{ items: AdminUserListItem[]; limit: number; offset: number }> {
  const row = await queryCommand<
    PayloadRow<{ items: AdminUserListItem[]; limit: number; offset: number }>
  >(
    context,
    `SELECT commands.search_admin_users($1, $2, $3) AS payload`,
    [args.query, args.limit, args.offset],
  );
  return row.payload;
}

export async function getAdminUserSql(
  context: RequestContext,
  accountId: string,
): Promise<AdminUserDetail> {
  const row = await queryCommand<PayloadRow<AdminUserDetail>>(
    context,
    `SELECT commands.get_admin_user($1) AS payload`,
    [accountId],
  );
  return row.payload;
}

export async function suspendAccountSql(
  context: RequestContext,
  args: { accountId: string; reason: string; version: number },
): Promise<{ id: string; status: string; version: number }> {
  const row = await queryCommand<
    PayloadRow<{ id: string; status: string; version: number }>
  >(
    context,
    `SELECT commands.suspend_account($1, $2, $3) AS payload`,
    [args.accountId, args.reason, args.version],
  );
  return row.payload;
}

export async function restoreAccountSql(
  context: RequestContext,
  args: { accountId: string; reason: string; version: number },
): Promise<{ id: string; status: string; version: number }> {
  const row = await queryCommand<
    PayloadRow<{ id: string; status: string; version: number }>
  >(
    context,
    `SELECT commands.restore_account($1, $2, $3) AS payload`,
    [args.accountId, args.reason, args.version],
  );
  return row.payload;
}

export async function adminSetUserRoleSql(
  context: RequestContext,
  args: {
    accountId: string;
    role: string;
    reason: string;
    version: number;
  },
): Promise<{ id: string; homeRole: string; version: number }> {
  const row = await queryCommand<
    PayloadRow<{ id: string; homeRole: string; version: number }>
  >(
    context,
    `SELECT commands.admin_set_user_role($1, $2, $3, $4) AS payload`,
    [args.accountId, args.role, args.reason, args.version],
  );
  return row.payload;
}

export async function listAuditEventsSql(
  context: RequestContext,
  args: {
    actorId: string | null;
    targetId: string | null;
    action: string | null;
    from: string | null;
    to: string | null;
    limit: number;
    offset: number;
  },
): Promise<{ items: AdminAuditRow[]; limit: number; offset: number }> {
  const row = await queryCommand<
    PayloadRow<{ items: AdminAuditRow[]; limit: number; offset: number }>
  >(
    context,
    `SELECT commands.list_audit_events($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7) AS payload`,
    [
      args.actorId,
      args.targetId,
      args.action,
      args.from,
      args.to,
      args.limit,
      args.offset,
    ],
  );
  return row.payload;
}

export async function requestSupportExportSql(
  context: RequestContext,
  args: { accountId: string; reason: string },
): Promise<SupportRequestPayload> {
  const row = await queryCommand<PayloadRow<SupportRequestPayload>>(
    context,
    `SELECT commands.request_support_export($1, $2) AS payload`,
    [args.accountId, args.reason],
  );
  return row.payload;
}

export async function requestSupportDeletionSql(
  context: RequestContext,
  args: { accountId: string; reason: string },
): Promise<SupportRequestPayload> {
  const row = await queryCommand<PayloadRow<SupportRequestPayload>>(
    context,
    `SELECT commands.request_support_deletion($1, $2) AS payload`,
    [args.accountId, args.reason],
  );
  return row.payload;
}
