import { USER_ROLES, type UserRole } from "../types";

export function parseUserRole(value: unknown): UserRole | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const role of USER_ROLES) {
    if (role === value) {
      return role;
    }
  }

  return null;
}

export function resolveUserRole(value: unknown): UserRole {
  return parseUserRole(value) ?? "student";
}
