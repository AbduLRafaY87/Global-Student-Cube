"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types";

export interface OnboardingActionState {
  error?: string;
  fieldErrors?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
}

export async function completeOnboarding(
  _prevState: OnboardingActionState | null,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to complete onboarding." };
  }

  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phoneValue = String(formData.get("phone") ?? "").trim();
  const fieldErrors: NonNullable<OnboardingActionState["fieldErrors"]> = {};

  if (!firstName) {
    fieldErrors.first_name = "Enter your first name.";
  }

  if (!lastName) {
    fieldErrors.last_name = "Enter your last name.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const phone = phoneValue.length > 0 ? phoneValue : null;
  const profileUpdate: Pick<
    UserProfile,
    "id" | "first_name" | "last_name" | "phone" | "role" | "onboarding_completed"
  > = {
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    phone,
    role:
      existingProfile?.role === "parent" ||
      existingProfile?.role === "counselor" ||
      existingProfile?.role === "admin"
        ? existingProfile.role
        : "student",
    onboarding_completed: true,
  };

  const { error } = await supabase.from("user_profiles").upsert(profileUpdate);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/onboarding");
  redirect("/");
}
