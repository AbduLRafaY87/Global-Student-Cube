"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActivityActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    title?: string;
    organization?: string;
    role?: string;
    description?: string;
    hours_per_week?: string;
    weeks_per_year?: string;
  };
}

function parseNonNegativeNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

function readActivityFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const organization = String(formData.get("organization") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  const hoursPerWeek = parseNonNegativeNumber(formData.get("hours_per_week"));
  const weeksPerYear = parseNonNegativeNumber(formData.get("weeks_per_year"));
  const fieldErrors: NonNullable<ActivityActionState["fieldErrors"]> = {};

  if (!title) {
    fieldErrors.title = "Enter an activity name.";
  }

  if (!organization) {
    fieldErrors.organization = "Enter the organization.";
  }

  if (!role) {
    fieldErrors.role = "Enter your position or role.";
  }

  if (hoursPerWeek === null) {
    fieldErrors.hours_per_week = "Enter hours per week of 0 or more.";
  }

  if (weeksPerYear === null) {
    fieldErrors.weeks_per_year = "Enter weeks per year of 0 or more.";
  }

  return {
    title,
    organization,
    role,
    description,
    hoursPerWeek,
    weeksPerYear,
    fieldErrors,
  };
}

export async function addActivity(
  _prevState: ActivityActionState | null,
  formData: FormData,
): Promise<ActivityActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to add an activity." };
  }

  const fields = readActivityFields(formData);

  if (Object.keys(fields.fieldErrors).length > 0) {
    return { fieldErrors: fields.fieldErrors };
  }

  if (fields.hoursPerWeek === null || fields.weeksPerYear === null) {
    return { error: "Enter valid hours and weeks." };
  }

  const { error } = await supabase.from("activities").insert({
    student_id: user.id,
    title: fields.title,
    organization: fields.organization,
    role: fields.role,
    description: fields.description,
    hours_per_week: fields.hoursPerWeek,
    weeks_per_year: fields.weeksPerYear,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/activities");
  return { success: true };
}

export async function updateActivity(
  _prevState: ActivityActionState | null,
  formData: FormData,
): Promise<ActivityActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to update an activity." };
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { error: "Missing activity id." };
  }

  const fields = readActivityFields(formData);

  if (Object.keys(fields.fieldErrors).length > 0) {
    return { fieldErrors: fields.fieldErrors };
  }

  if (fields.hoursPerWeek === null || fields.weeksPerYear === null) {
    return { error: "Enter valid hours and weeks." };
  }

  const { error } = await supabase
    .from("activities")
    .update({
      title: fields.title,
      organization: fields.organization,
      role: fields.role,
      description: fields.description,
      hours_per_week: fields.hoursPerWeek,
      weeks_per_year: fields.weeksPerYear,
    })
    .eq("id", id)
    .eq("student_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/activities");
  return { success: true };
}

export async function deleteActivity(formData: FormData) {
  const { supabase, user } = await requireUser();

  if (!user) {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .eq("student_id", user.id);

  revalidatePath("/activities");
}
