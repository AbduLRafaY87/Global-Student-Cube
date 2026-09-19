import { RegistrationForm } from "@/components/forms/RegistrationForm";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Pick<
    UserProfile,
    "first_name" | "last_name" | "phone"
  > | null = null;

  if (user) {
    const { data } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      profile = {
        first_name: typeof data.first_name === "string" ? data.first_name : "",
        last_name: typeof data.last_name === "string" ? data.last_name : "",
        phone: typeof data.phone === "string" ? data.phone : null,
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
