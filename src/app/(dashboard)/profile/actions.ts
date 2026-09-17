"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StudentProfileInsert } from "@/types";

const TEST_SCORE_KEYS = ["sat", "act", "toefl", "ielts"] as const;

export interface StudentProfileActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    target_major?: string;
    target_country?: string;
    graduation_year?: string;
    gpa?: string;
    test_scores?: string;
  };
}

function parseRequiredText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function parseRequiredNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTestScores(formData: FormData): Record<string, unknown> {
  const scores: Record<string, unknown> = {};

  for (const key of TEST_SCORE_KEYS) {
    const raw = String(formData.get(key) ?? "").trim();
    if (raw === "") {
      continue;
    }

    const numeric = Number(raw);
    scores[key] = Number.isFinite(numeric) ? numeric : raw;
  }

  return scores;
}

function readName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function upsertStudentProfile(
  _prevState: StudentProfileActionState | null,
  formData: FormData,
): Promise<StudentProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to save your student profile." };
  }

  const targetMajor = parseRequiredText(formData.get("target_major"));
  const targetCountry = parseRequiredText(formData.get("target_country"));
  const graduationYear = parseRequiredNumber(formData.get("graduation_year"));
  const gpa = parseRequiredNumber(formData.get("gpa"));
  const fieldErrors: NonNullable<StudentProfileActionState["fieldErrors"]> =
    {};

  if (!targetMajor) {
    fieldErrors.target_major = "Enter your target major.";
  }

  if (!targetCountry) {
    fieldErrors.target_country = "Enter your target country.";
  }

  if (graduationYear === null || !Number.isInteger(graduationYear)) {
    fieldErrors.graduation_year = "Enter a valid graduation year.";
  }

  if (gpa === null) {
    fieldErrors.gpa = "Enter a valid GPA.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  if (graduationYear === null || gpa === null) {
    return { error: "Enter a valid graduation year and GPA." };
  }

  const { data: existingProfile } = await supabase
    .from("student_profiles")
    .select("id, first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const firstName =
    readName(existingProfile?.first_name) || readName(userProfile?.first_name);
  const lastName =
    readName(existingProfile?.last_name) || readName(userProfile?.last_name);

  if (!firstName || !lastName) {
    return {
      error: "Complete onboarding with your first and last name before saving a student profile.",
    };
  }

  const payload: StudentProfileInsert = {
    user_id: user.id,
    first_name: firstName,
    last_name: lastName,
    target_major: targetMajor,
    target_country: targetCountry,
    graduation_year: graduationYear,
    gpa,
    test_scores: parseTestScores(formData),
  };

  if (typeof existingProfile?.id === "string") {
    payload.id = existingProfile.id;
  }

  const { error } = await supabase
    .from("student_profiles")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  return { success: true };
}
