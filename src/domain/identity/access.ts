export const AUTH_ENTRY_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/register",
  "/register/identity",
  "/register/contact",
  "/register/review",
]);

export const VERIFY_EMAIL_PATH = "/verify-email";
export const PASSWORD_RESET_PATH = "/password-reset";

export function isAuthEntryPath(pathname: string): boolean {
  return AUTH_ENTRY_PATHS.has(pathname);
}

export function unverifiedProtectedRedirect(
  pathname: string,
  emailVerified: boolean,
  isDashboardPath: boolean,
): string | null {
  if (emailVerified) {
    return null;
  }

  if (isDashboardPath) {
    return VERIFY_EMAIL_PATH;
  }

  if (pathname === VERIFY_EMAIL_PATH || pathname.startsWith(PASSWORD_RESET_PATH)) {
    return null;
  }

  return null;
}

export function verifiedAuthEntryRedirect(
  pathname: string,
  emailVerified: boolean,
  homePath: string,
): string | null {
  if (!emailVerified) {
    if (isAuthEntryPath(pathname) && pathname !== "/") {
      return VERIFY_EMAIL_PATH;
    }
    return null;
  }

  if (isAuthEntryPath(pathname)) {
    return homePath;
  }

  return null;
}
