"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import { parseFormVersion } from "@/server/http/headers";
import { updateUserProfile } from "@/server/modules/identity/update-user-profile";

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

  try {
    const context = await resolveRequestContext();
    const expectedVersion = parseFormVersion(formData.get("version"));
    await updateUserProfile(context, {
      expectedVersion,
      firstName,
      lastName,
      phone: phoneValue.length > 0 ? phoneValue : null,
      onboardingCompleted: true,
    });
  } catch (error) {
    if (error instanceof CommandError) {
      return { error: error.message };
    }
    return { error: "Unable to save your profile. Please try again." };
  }

  revalidatePath("/onboarding");
  redirect("/");
}
