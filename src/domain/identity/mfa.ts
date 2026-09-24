import { isPrivilegedHomeRole } from "./home-role";

export const MFA_PATH = "/mfa";
export const INVITE_ACCEPT_PATH = "/invite/accept";

export const PRIVILEGED_PATH_PREFIXES = ["/admin", "/counselor"] as const;

export type AssuranceLevel = "none" | "aal1" | "aal2";

export function isPrivilegedPath(pathname: string): boolean {
  return PRIVILEGED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function privilegedMfaRedirect(
  pathname: string,
  homeRole: string,
  assurance: AssuranceLevel,
): string | null {
  if (!isPrivilegedHomeRole(homeRole) || !isPrivilegedPath(pathname)) {
    return null;
  }

  if (assurance === "aal2") {
    return null;
  }

  if (pathname === MFA_PATH || pathname.startsWith(`${MFA_PATH}/`)) {
    return null;
  }

  return MFA_PATH;
}

export function commandRequiresAal2(homeRole: string): boolean {
  return isPrivilegedHomeRole(homeRole);
}
