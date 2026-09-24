export const ACCOUNT_ROLES = [
  "student",
  "parent",
  "alumni",
  "mentor",
  "counselor",
  "admin",
] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const HOME_ROLES = ["student", "parent", "counselor", "admin"] as const;

export type HomeRole = (typeof HOME_ROLES)[number];

const HOME_RANK: Record<HomeRole, number> = {
  student: 0,
  parent: 1,
  counselor: 2,
  admin: 3,
};

export function isAccountRole(value: string): value is AccountRole {
  return (ACCOUNT_ROLES as readonly string[]).includes(value);
}

export function projectedHomeRole(roles: readonly string[]): HomeRole {
  let highest: HomeRole = "student";

  for (const role of roles) {
    if (role === "admin" || role === "counselor" || role === "parent") {
      if (HOME_RANK[role] > HOME_RANK[highest]) {
        highest = role;
      }
    }
  }

  return highest;
}

export function isPrivilegedHomeRole(role: string): boolean {
  return role === "admin" || role === "counselor";
}
