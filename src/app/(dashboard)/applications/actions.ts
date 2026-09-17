"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/types";

export interface ApplicationActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    university_id?: string;
    status?: string;
    deadline?: string;
  };
}

function parseApplicationStatus(value: string): ApplicationStatus | null {
  for (const status of APPLICATION_STATUSES) {
    if (status === value) {
      return status;
    }
  }

  return null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function createApplication(
  _prevState: ApplicationActionState | null,
  formData: FormData,
): Promise<ApplicationActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to add an application." };
  }

  const universityId = String(formData.get("university_id") ?? "").trim();
  const status = parseApplicationStatus(String(formData.get("status") ?? ""));
  const deadline = String(formData.get("deadline") ?? "").trim();
  const fieldErrors: NonNullable<ApplicationActionState["fieldErrors"]> = {};

  if (!universityId) {
    fieldErrors.university_id = "Select a university.";
  }

  if (!status) {
    fieldErrors.status = "Select a status.";
  }

  if (!deadline) {
    fieldErrors.deadline = "Enter a deadline.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  if (!status) {
    return { error: "Select a valid status." };
  }

  const { error } = await supabase.from("applications").insert({
    student_id: user.id,
    university_id: universityId,
    status,
    deadline,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/applications");
  return { success: true };
}

export async function updateApplicationStatus(
  _prevState: ApplicationActionState | null,
  formData: FormData,
): Promise<ApplicationActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to update an application." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const status = parseApplicationStatus(String(formData.get("status") ?? ""));
  const universityId = String(formData.get("university_id") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();
  const fieldErrors: NonNullable<ApplicationActionState["fieldErrors"]> = {};

  if (!id) {
    return { error: "Missing application id." };
  }

  if (!status) {
    fieldErrors.status = "Select a status.";
  }

  if (universityId === "" && formData.has("university_id")) {
    fieldErrors.university_id = "Select a university.";
  }

  if (deadline === "" && formData.has("deadline")) {
    fieldErrors.deadline = "Enter a deadline.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  if (!status) {
    return { error: "Select a valid status." };
  }

  const updates: {
    status: ApplicationStatus;
    university_id?: string;
    deadline?: string;
  } = { status };

  if (universityId) {
    updates.university_id = universityId;
  }

  if (deadline) {
    updates.deadline = deadline;
  }

  const { error } = await supabase
    .from("applications")
    .update(updates)
    .eq("id", id)
    .eq("student_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/applications");
  return { success: true };
}

export async function deleteApplication(formData: FormData) {
  const { supabase, user } = await requireUser();

  if (!user) {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("student_id", user.id);

  revalidatePath("/applications");
}
