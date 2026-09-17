"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TEST_TYPES, type TestType } from "@/types";

export interface TestScoreActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    test_type?: string;
    score?: string;
    test_date?: string;
  };
}

function parseTestType(value: string): TestType | null {
  for (const type of TEST_TYPES) {
    if (type === value) {
      return type;
    }
  }

  return null;
}

function parseScore(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

function readScoreFields(formData: FormData) {
  const testType = parseTestType(String(formData.get("test_type") ?? ""));
  const score = parseScore(formData.get("score"));
  const testDate = String(formData.get("test_date") ?? "").trim();
  const isOfficial = formData.get("is_official") === "on";
  const fieldErrors: NonNullable<TestScoreActionState["fieldErrors"]> = {};

  if (!testType) {
    fieldErrors.test_type = "Select a test type.";
  }

  if (score === null) {
    fieldErrors.score = "Enter a valid score.";
  }

  if (!testDate) {
    fieldErrors.test_date = "Enter a test date.";
  }

  return { testType, score, testDate, isOfficial, fieldErrors };
}

export async function logTestScore(
  _prevState: TestScoreActionState | null,
  formData: FormData,
): Promise<TestScoreActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to log a test score." };
  }

  const fields = readScoreFields(formData);

  if (Object.keys(fields.fieldErrors).length > 0) {
    return { fieldErrors: fields.fieldErrors };
  }

  if (!fields.testType || fields.score === null) {
    return { error: "Enter a valid test type and score." };
  }

  const { error } = await supabase.from("test_scores_log").insert({
    student_id: user.id,
    test_type: fields.testType,
    score: fields.score,
    test_date: fields.testDate,
    is_official: fields.isOfficial,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/test-prep");
  return { success: true };
}

export async function updateTestScore(
  _prevState: TestScoreActionState | null,
  formData: FormData,
): Promise<TestScoreActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to update a test score." };
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { error: "Missing score id." };
  }

  const fields = readScoreFields(formData);

  if (Object.keys(fields.fieldErrors).length > 0) {
    return { fieldErrors: fields.fieldErrors };
  }

  if (!fields.testType || fields.score === null) {
    return { error: "Enter a valid test type and score." };
  }

  const { error } = await supabase
    .from("test_scores_log")
    .update({
      test_type: fields.testType,
      score: fields.score,
      test_date: fields.testDate,
      is_official: fields.isOfficial,
    })
    .eq("id", id)
    .eq("student_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/test-prep");
  return { success: true };
}

export async function removeTestScore(formData: FormData) {
  const { supabase, user } = await requireUser();

  if (!user) {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  await supabase
    .from("test_scores_log")
    .delete()
    .eq("id", id)
    .eq("student_id", user.id);

  revalidatePath("/test-prep");
}
