import { createServerClient } from "@supabase/ssr";
import {
  isAuthEntryPath,
  unverifiedProtectedRedirect,
  verifiedAuthEntryRedirect,
} from "@/domain/identity/access";
import { isSuspended, type AccountStatus } from "@/domain/identity/account-status";
import {
  privilegedMfaRedirect,
  type AssuranceLevel,
} from "@/domain/identity/mfa";
import {
  dashboardRoleRedirect,
  homePathForRole,
  isExistingDashboardPath,
} from "@/domain/navigation";
import { resolveUserRole } from "@/domain/roles";
import { type NextRequest, NextResponse } from "next/server";

function redirectWithCookies(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string,
): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";
  const redirectResponse = NextResponse.redirect(redirectUrl);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-gsc-pathname", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;
  const emailVerified = Boolean(user.email_confirmed_at);
  const unverifiedRedirect = unverifiedProtectedRedirect(
    pathname,
    emailVerified,
    isExistingDashboardPath(pathname),
  );

  if (unverifiedRedirect) {
    return redirectWithCookies(request, supabaseResponse, unverifiedRedirect);
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  const status = (account?.status ?? null) as AccountStatus | null;

  if (isSuspended(status)) {
    await supabase.auth.signOut();
    return redirectWithCookies(request, supabaseResponse, "/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = resolveUserRole(profile?.role);
  const homePath = homePathForRole(role);

  let assurance: AssuranceLevel = emailVerified ? "aal1" : "none";
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel === "aal2") {
      assurance = "aal2";
    } else if (data?.currentLevel === "aal1") {
      assurance = "aal1";
    }
  } catch {
    // Email-derived assurance is enough to force enrollment.
  }

  const mfaRedirect = privilegedMfaRedirect(pathname, role, assurance);
  if (mfaRedirect) {
    return redirectWithCookies(request, supabaseResponse, mfaRedirect);
  }

  if (isAuthEntryPath(pathname)) {
    const entryRedirect = verifiedAuthEntryRedirect(
      pathname,
      emailVerified,
      homePath,
    );
    if (entryRedirect) {
      return redirectWithCookies(request, supabaseResponse, entryRedirect);
    }
  }

  if (isExistingDashboardPath(pathname)) {
    const mismatchPath = dashboardRoleRedirect(pathname, role);
    if (mismatchPath) {
      return redirectWithCookies(request, supabaseResponse, mismatchPath);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
