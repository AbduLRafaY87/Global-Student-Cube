import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { DashboardHeaderUser } from "@/components/layout/Header";
import {
  BOTTOM_NAV,
  DASHBOARD_NAV,
  dashboardRoleRedirect,
} from "@/domain/navigation";
import { privilegedMfaRedirect, toAssuranceLevel } from "@/domain/identity/mfa";
import { resolveUserRole } from "@/domain/roles";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.email_confirmed_at) {
    redirect("/verify-email");
  }

  const [{ data: profile }, { count }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("first_name, last_name, role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);

  const role = resolveUserRole(profile?.role);
  const pathname = (await headers()).get("x-gsc-pathname") ?? "";

  let assurance = toAssuranceLevel("aal1");
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    assurance = toAssuranceLevel(data?.currentLevel ?? "aal1");
  } catch {
    assurance = toAssuranceLevel("aal1");
  }

  const mfaPath = privilegedMfaRedirect(pathname, role, assurance);
  if (mfaPath) {
    redirect(mfaPath);
  }

  const mismatchPath = dashboardRoleRedirect(pathname, role);
  if (mismatchPath) {
    redirect(mismatchPath);
  }

  const shellUser: DashboardHeaderUser = {
    email: user.email ?? "",
    first_name: typeof profile?.first_name === "string" ? profile.first_name : "",
    last_name: typeof profile?.last_name === "string" ? profile.last_name : "",
    role,
  };

  return (
    <DashboardLayout
      user={shellUser}
      unreadCount={count ?? 0}
      sections={DASHBOARD_NAV[role]}
      bottomNav={BOTTOM_NAV[role]}
    >
      {children}
    </DashboardLayout>
  );
}
