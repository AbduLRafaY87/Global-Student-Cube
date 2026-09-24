export const STAFF_PERMISSIONS = [
  "verification",
  "catalog_editorial",
  "case_oversight",
  "safety",
  "rewards_approval",
  "operations",
  "supervisor",
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export const ADMIN_ROUTE_SCOPES = {
  overview: null,
  approvals: "verification",
  escalate: "supervisor",
  users: "operations",
  audit: "operations",
  support: "operations",
} as const;

export type AdminRouteId = keyof typeof ADMIN_ROUTE_SCOPES;

export function isStaffPermission(value: string): value is StaffPermission {
  return (STAFF_PERMISSIONS as readonly string[]).includes(value);
}

export function hasLivePermission(
  granted: readonly string[],
  required: StaffPermission,
): boolean {
  return granted.includes(required);
}

export function canAccessAdminRoute(
  homeRole: string,
  assurance: string,
  granted: readonly string[],
  route: AdminRouteId,
): boolean {
  if (homeRole !== "admin" || assurance !== "aal2") {
    return false;
  }
  const required = ADMIN_ROUTE_SCOPES[route];
  if (required === null) {
    return true;
  }
  return hasLivePermission(granted, required);
}
