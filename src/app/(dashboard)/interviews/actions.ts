"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INTERVIEW_STATUSES, type InterviewStatus } from "@/types";

export interface InterviewActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    university_id?: string;
    scheduled_at?: string;
    interviewer_name?: string;
    notes?: string;
    status?: string;
  };
}

function parseInterviewStatus(value: string): InterviewStatus | null {
  for (const status of INTERVIEW_STATUSES) {
    if (status === value) {
      return status;
    }
  }

  return null;
}

function parseUniversityId(value: FormDataEntryValue | null): string | null {
  const universityId = String(value ?? "").trim();
  return universityId === "" ? null : universityId;
}

function parseScheduledAt(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (raw === "") {
    return null;
  }

  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return raw;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

function readInterviewFields(formData: FormData) {
  const universityId = parseUniversityId(formData.get("university_id"));
  const scheduledAt = parseScheduledAt(formData.get("scheduled_at"));
  const interviewerName = String(formData.get("interviewer_name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "");
  const status = parseInterviewStatus(String(formData.get("status") ?? ""));
  const fieldErrors: NonNullable<InterviewActionState["fieldErrors"]> = {};

  if (!scheduledAt) {
    fieldErrors.scheduled_at = "Enter a valid interview date and time.";
  }

  if (!interviewerName) {
    fieldErrors.interviewer_name = "Enter the interviewer name.";
  }

  if (!status) {
    fieldErrors.status = "Select a status.";
  }

  return {
    universityId,
    scheduledAt,
    interviewerName,
    notes,
    status,
    fieldErrors,
  };
}

export async function logInterview(
  _prevState: InterviewActionState | null,
  formData: FormData,
): Promise<InterviewActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to log an interview." };
  }

  const fields = readInterviewFields(formData);

  if (Object.keys(fields.fieldErrors).length > 0) {
    return { fieldErrors: fields.fieldErrors };
  }

  if (!fields.scheduledAt || !fields.status) {
    return { error: "Enter a valid date and status." };
  }

  const { error } = await supabase.from("interview_sessions").insert({
    student_id: user.id,
    university_id: fields.universityId,
    scheduled_at: fields.scheduledAt,
    interviewer_name: fields.interviewerName,
    notes: fields.notes,
    status: fields.status,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/interviews");
  return { success: true };
}

export async function updateInterview(
  _prevState: InterviewActionState | null,
  formData: FormData,
): Promise<InterviewActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to update an interview." };
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { error: "Missing interview id." };
  }

  const fields = readInterviewFields(formData);

  if (Object.keys(fields.fieldErrors).length > 0) {
    return { fieldErrors: fields.fieldErrors };
  }

  if (!fields.scheduledAt || !fields.status) {
    return { error: "Enter a valid date and status." };
  }

  const { error } = await supabase
    .from("interview_sessions")
    .update({
      university_id: fields.universityId,
      scheduled_at: fields.scheduledAt,
      interviewer_name: fields.interviewerName,
      notes: fields.notes,
      status: fields.status,
    })
    .eq("id", id)
    .eq("student_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/interviews");
  return { success: true };
}
