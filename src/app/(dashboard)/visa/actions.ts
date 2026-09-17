"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface VisaActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    country?: string;
    document_name?: string;
    notes?: string;
  };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function addVisaRequirement(
  _prevState: VisaActionState | null,
  formData: FormData,
): Promise<VisaActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to add a visa requirement." };
  }

  const country = String(formData.get("country") ?? "").trim();
  const documentName = String(formData.get("document_name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "");
  const fieldErrors: NonNullable<VisaActionState["fieldErrors"]> = {};

  if (!country) {
    fieldErrors.country = "Enter a destination country.";
  }

  if (!documentName) {
    fieldErrors.document_name = "Enter the document or requirement name.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const { error } = await supabase.from("visa_checklists").insert({
    student_id: user.id,
    country,
    document_name: documentName,
    notes,
    is_completed: false,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/visa");
  return { success: true };
}

export async function toggleVisaChecklistItem(formData: FormData) {
  const { supabase, user } = await requireUser();

  if (!user) {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  const { data } = await supabase
    .from("visa_checklists")
    .select("is_completed")
    .eq("id", id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!data) {
    return;
  }

  await supabase
    .from("visa_checklists")
    .update({ is_completed: data.is_completed !== true })
    .eq("id", id)
    .eq("student_id", user.id);

  revalidatePath("/visa");
}
