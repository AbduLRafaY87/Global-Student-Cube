import { RegistrationForm } from "@/components/forms/RegistrationForm";
import { createClient } from "@/lib/supabase/server";
import { USER_ROLES, type UserProfile, type UserRole } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding",
};

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

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Pick<
    UserProfile,
    "first_name" | "last_name" | "phone" | "role"
  > | null = null;

  if (user) {
    const { data } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, phone, role")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      const role = parseUserRole(data.role);
      profile = {
        first_name: typeof data.first_name === "string" ? data.first_name : "",
        last_name: typeof data.last_name === "string" ? data.last_name : "",
        phone: typeof data.phone === "string" ? data.phone : null,
        role: role ?? "student",
      };
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-md">
        <RegistrationForm profile={profile} />
      </div>
    </div>
  );
}
