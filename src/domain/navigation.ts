import type { UserRole } from "../types";

export type NavIconName =
  | "user"
  | "graduationCap"
  | "award"
  | "fileText"
  | "folderOpen"
  | "messageSquare"
  | "bell"
  | "clipboardCheck"
  | "checkSquare"
  | "trophy"
  | "plane"
  | "home"
  | "waypoints"
  | "users"
  | "heartHandshake"
  | "shield"
  | "settings"
  | "moreHorizontal";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: NavIconName;
}

export interface DashboardNavSection {
  id: string;
  label: string;
  items: DashboardNavItem[];
}

export interface BottomNavItem extends DashboardNavItem {
  kind: "link";
}

export interface BottomNavMore {
  kind: "more";
  label: "More";
  icon: "moreHorizontal";
}

export type BottomNavEntry = BottomNavItem | BottomNavMore;

const ONBOARDING_PATH = "/onboarding";

export const DASHBOARD_NAV: Record<UserRole, DashboardNavSection[]> = {
  student: [
    {
      id: "discover",
      label: "Discover",
      items: [
        { href: "/universities", label: "Universities", icon: "graduationCap" },
        { href: "/scholarships", label: "Scholarships", icon: "award" },
      ],
    },
    {
      id: "apply",
      label: "Apply",
      items: [
        { href: "/profile", label: "Profile", icon: "user" },
        { href: "/applications", label: "Applications", icon: "fileText" },
        { href: "/documents", label: "Documents", icon: "folderOpen" },
      ],
    },
    {
      id: "prepare",
      label: "Prepare",
      items: [
        { href: "/test-prep", label: "Tests", icon: "clipboardCheck" },
        { href: "/activities", label: "Activities", icon: "trophy" },
        { href: "/tasks", label: "Tasks", icon: "checkSquare" },
      ],
    },
    {
      id: "decide",
      label: "Decide",
      items: [
        { href: "/housing", label: "Housing", icon: "home" },
        { href: "/visa", label: "Visa", icon: "plane" },
      ],
    },
    {
      id: "support",
      label: "Support",
      items: [
        { href: "/counselor", label: "Counselor", icon: "users" },
        { href: "/alumni", label: "Mentors", icon: "waypoints" },
        { href: "/messages", label: "Messages", icon: "messageSquare" },
        { href: "/notifications", label: "Notifications", icon: "bell" },
      ],
    },
  ],
  parent: [
    {
      id: "family",
      label: "Family",
      items: [
        { href: "/parent-portal", label: "Family overview", icon: "heartHandshake" },
        { href: "/profile", label: "Profile", icon: "user" },
      ],
    },
    {
      id: "discover",
      label: "Discover",
      items: [
        { href: "/universities", label: "Universities", icon: "graduationCap" },
        { href: "/scholarships", label: "Scholarships", icon: "award" },
      ],
    },
    {
      id: "support",
      label: "Support",
      items: [
        { href: "/messages", label: "Messages", icon: "messageSquare" },
        { href: "/notifications", label: "Notifications", icon: "bell" },
      ],
    },
  ],
  counselor: [
    {
      id: "work",
      label: "Caseload",
      items: [
        { href: "/counselor", label: "Students", icon: "users" },
        { href: "/tasks", label: "Tasks", icon: "checkSquare" },
        { href: "/profile", label: "Profile", icon: "user" },
      ],
    },
    {
      id: "support",
      label: "Support",
      items: [
        { href: "/messages", label: "Messages", icon: "messageSquare" },
        { href: "/notifications", label: "Notifications", icon: "bell" },
      ],
    },
  ],
  admin: [
    {
      id: "operations",
      label: "Operations",
      items: [
        { href: "/admin", label: "Overview", icon: "shield" },
        { href: "/universities", label: "Universities", icon: "graduationCap" },
        { href: "/scholarships", label: "Scholarships", icon: "award" },
        { href: "/profile", label: "Profile", icon: "user" },
        { href: "/notifications", label: "Notifications", icon: "bell" },
      ],
    },
  ],
};

export const BOTTOM_NAV: Record<UserRole, BottomNavEntry[]> = {
  student: [
    { kind: "link", href: "/profile", label: "Profile", icon: "user" },
    { kind: "link", href: "/universities", label: "Explore", icon: "graduationCap" },
    { kind: "link", href: "/messages", label: "Messages", icon: "messageSquare" },
    { kind: "more", label: "More", icon: "moreHorizontal" },
  ],
  parent: [
    { kind: "link", href: "/parent-portal", label: "Family", icon: "heartHandshake" },
    { kind: "link", href: "/universities", label: "Explore", icon: "graduationCap" },
    { kind: "link", href: "/messages", label: "Messages", icon: "messageSquare" },
    { kind: "more", label: "More", icon: "moreHorizontal" },
  ],
  counselor: [
    { kind: "link", href: "/counselor", label: "Students", icon: "users" },
    { kind: "link", href: "/messages", label: "Messages", icon: "messageSquare" },
    { kind: "link", href: "/profile", label: "Profile", icon: "user" },
    { kind: "more", label: "More", icon: "moreHorizontal" },
  ],
  admin: [
    { kind: "link", href: "/admin", label: "Admin", icon: "shield" },
    { kind: "link", href: "/universities", label: "Catalog", icon: "graduationCap" },
    { kind: "link", href: "/profile", label: "Profile", icon: "user" },
    { kind: "more", label: "More", icon: "moreHorizontal" },
  ],
};

const EXISTING_DASHBOARD_PREFIXES = [
  "/profile",
  "/universities",
  "/applications",
  "/documents",
  "/scholarships",
  "/messages",
  "/notifications",
  "/essays",
  "/recommendations",
  "/test-prep",
  "/interviews",
  "/admission-odds",
  "/tasks",
  "/activities",
  "/visa",
  "/housing",
  "/alumni",
  "/offers",
  "/billing",
  "/counselor",
  "/parent-portal",
  "/admin",
  "/onboarding",
] as const;

export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "parent":
      return "/parent-portal";
    case "counselor":
      return "/counselor";
    case "admin":
      return "/admin";
    default:
      return "/profile";
  }
}

export function flattenNavItems(role: UserRole): DashboardNavItem[] {
  return DASHBOARD_NAV[role].flatMap((section) => section.items);
}

export function navTitleForPath(pathname: string, role: UserRole): string {
  const match = flattenNavItems(role).find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  if (match) {
    return match.label;
  }

  if (pathname.startsWith(ONBOARDING_PATH)) {
    return "Onboarding";
  }

  return "Dashboard";
}

function pathMatches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isExistingDashboardPath(pathname: string): boolean {
  return EXISTING_DASHBOARD_PREFIXES.some((prefix) => pathMatches(pathname, prefix));
}

export function isPathAllowedForRole(pathname: string, role: UserRole): boolean {
  if (pathMatches(pathname, ONBOARDING_PATH)) {
    return true;
  }

  if (!isExistingDashboardPath(pathname)) {
    return true;
  }

  return flattenNavItems(role).some((item) => pathMatches(pathname, item.href));
}

/** Shared by `src/proxy.ts` and the dashboard layout. Null means the request may proceed. */
export function dashboardRoleRedirect(
  pathname: string,
  role: UserRole,
): string | null {
  if (!pathname || isPathAllowedForRole(pathname, role)) {
    return null;
  }

  return homePathForRole(role);
}
