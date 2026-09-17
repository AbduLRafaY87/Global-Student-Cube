"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { USER_ROLES, type UserProfile, type UserRole } from "@/types";

export interface OnboardingActionState {
  error?: string;
  fieldErrors?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    role?: string;
  };
}

function parseUserRole(value: string): UserRole | null {
  for (const role of USER_ROLES) {
    if (role === value) {
      return role;
    }
  }

  return null;
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

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phoneValue = String(formData.get("phone") ?? "").trim();
  const role = parseUserRole(String(formData.get("role") ?? ""));
  const fieldErrors: NonNullable<OnboardingActionState["fieldErrors"]> = {};

  if (!firstName) {
    fieldErrors.first_name = "Enter your first name.";
  }

  if (!lastName) {
    fieldErrors.last_name = "Enter your last name.";
  }

  if (!role) {
    fieldErrors.role = "Select a role.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  if (!role) {
    return { error: "Select a valid role." };
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
    role,
    onboarding_completed: true,
  };

  const { error } = await supabase.from("user_profiles").upsert(profileUpdate);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/onboarding");
  redirect("/");
}
