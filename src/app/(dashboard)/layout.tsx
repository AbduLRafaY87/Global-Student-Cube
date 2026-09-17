import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { DashboardHeaderUser } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { USER_ROLES, type UserRole } from "@/types";
import { redirect } from "next/navigation";

function parseUserRole(value: unknown): UserRole | null {
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

  const shellUser: DashboardHeaderUser = {
    email: user.email ?? "",
    first_name: typeof profile?.first_name === "string" ? profile.first_name : "",
    last_name: typeof profile?.last_name === "string" ? profile.last_name : "",
    role: parseUserRole(profile?.role),
  };

  return (
    <DashboardLayout user={shellUser} unreadCount={count ?? 0}>
      {children}
    </DashboardLayout>
  );
}
