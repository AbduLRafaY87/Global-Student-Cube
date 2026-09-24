import { PARENT_SCOPES, type ParentScope } from "../identity/invitations";

export const PARENT_LINK_KINDS = ["adult_authorized", "verified_guardian"] as const;
export type ParentLinkKind = (typeof PARENT_LINK_KINDS)[number];

export const PARENT_LINK_STATUSES = [
  "draft",
  "invited",
  "accepted_pending_verification",
  "active",
  "declined",
  "revoked",
  "expired",
] as const;
export type ParentLinkStatus = (typeof PARENT_LINK_STATUSES)[number];

export const PARENT_SCOPE_GROUPS = [
  {
    id: "profile",
    label: "Profile",
    scopes: ["profile.read", "profile.write"],
  },
  {
    id: "finance",
    label: "Finance",
    scopes: ["finance.read", "finance.write"],
  },
  {
    id: "advisory",
    label: "Advisory",
    scopes: ["report.read"],
  },
  {
    id: "tasks",
    label: "Tasks",
    scopes: ["task.read", "task.write"],
  },
  {
    id: "sessions",
    label: "Session invitations",
    scopes: ["booking.manage"],
  },
] as const;

export function isParentLinkKind(value: string): value is ParentLinkKind {
  return (PARENT_LINK_KINDS as readonly string[]).includes(value);
}

export function isActiveParentLink(input: {
  status: string;
  revokedAt: string | null;
}): boolean {
  return input.status === "active" && input.revokedAt === null;
}

export function deriveCaseGrants(
  scopes: readonly string[],
  linkActive: boolean,
): ParentScope[] {
  if (!linkActive) {
    return [];
  }
  const granted = new Set<ParentScope>();
  for (const scope of scopes) {
    if ((PARENT_SCOPES as readonly string[]).includes(scope)) {
      granted.add(scope as ParentScope);
    }
    if (scope === "profile.write") {
      granted.add("profile.read");
    }
    if (scope === "finance.write") {
      granted.add("finance.read");
    }
    if (scope === "task.write") {
      granted.add("task.read");
    }
    if (scope === "shortlist.write") {
      granted.add("shortlist.read");
    }
  }
  return [...granted];
}

export function parentCan(
  scopes: readonly string[],
  required: ParentScope,
  linkActive: boolean,
): boolean {
  return deriveCaseGrants(scopes, linkActive).includes(required);
}

export function visibleCasesForParent<T extends { caseId: string; linkActive: boolean }>(
  rows: readonly T[],
): T[] {
  return rows.filter((row) => row.linkActive);
}

export function isolateChildRows<T extends { caseId: string }>(
  rows: readonly T[],
  selectedCaseId: string,
): T[] {
  return rows.filter((row) => row.caseId === selectedCaseId);
}

export function linkKindForStudentAge(ageYears: number): ParentLinkKind {
  return ageYears < 18 ? "verified_guardian" : "adult_authorized";
}

export function pendingLinkSeesOnlyStatus(status: string): boolean {
  return status !== "active";
}
