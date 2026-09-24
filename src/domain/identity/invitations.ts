import { isAccountRole, type AccountRole } from "./home-role";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const PARENT_SCOPES = [
  "profile.read",
  "profile.write",
  "finance.read",
  "finance.write",
  "shortlist.read",
  "shortlist.write",
  "booking.manage",
  "report.read",
  "task.read",
  "task.write",
  "journey.read",
] as const;

export type ParentScope = (typeof PARENT_SCOPES)[number];

export const INVITABLE_ROLES = [
  "parent",
  "alumni",
  "mentor",
  "counselor",
  "admin",
] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export function isInvitableRole(value: string): value is InvitableRole {
  return (INVITABLE_ROLES as readonly string[]).includes(value);
}

export function isParentScope(value: string): value is ParentScope {
  return (PARENT_SCOPES as readonly string[]).includes(value);
}

export function inviteExpiry(from = new Date()): Date {
  return new Date(from.getTime() + INVITE_TTL_MS);
}

export function isInviteUsable(input: {
  acceptedAt: string | null;
  revokedAt: string | null;
  expiresAt: string;
  now?: Date;
}): boolean {
  if (input.acceptedAt || input.revokedAt) {
    return false;
  }

  const now = input.now ?? new Date();
  return new Date(input.expiresAt).getTime() > now.getTime();
}

export function canInviteRole(role: string): role is AccountRole {
  return isAccountRole(role) && role !== "student";
}
