import { privilegedMfaRedirect, toAssuranceLevel } from "@/domain/identity/mfa";
import { resolveUserRole } from "@/domain/roles";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function SessionShellLayout({
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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {children}
    </div>
  );
}
