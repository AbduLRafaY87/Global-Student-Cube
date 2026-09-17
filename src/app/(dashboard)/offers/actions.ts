"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { OFFER_STATUSES, type OfferStatus } from "@/types";

export interface OfferActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    university_id?: string;
    financial_aid_amount?: string;
    tuition_cost?: string;
    deposit_deadline?: string;
    status?: string;
  };
}

function parseOfferStatus(value: string): OfferStatus | null {
  for (const status of OFFER_STATUSES) {
    if (status === value) {
      return status;
    }
  }

  return null;
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

function readOfferFields(formData: FormData) {
  const universityId = String(formData.get("university_id") ?? "").trim();
  const aidRaw = String(formData.get("financial_aid_amount") ?? "").trim();
  const financialAidAmount =
    aidRaw === "" ? 0 : parseNonNegativeNumber(formData.get("financial_aid_amount"));
  const tuitionCost = parseNonNegativeNumber(formData.get("tuition_cost"));
  const depositDeadline = String(formData.get("deposit_deadline") ?? "").trim();
  const status = parseOfferStatus(String(formData.get("status") ?? ""));
  const fieldErrors: NonNullable<OfferActionState["fieldErrors"]> = {};

  if (!universityId) {
    fieldErrors.university_id = "Select a university.";
  }

  if (financialAidAmount === null) {
    fieldErrors.financial_aid_amount = "Enter financial aid of 0 or more.";
  }

  if (tuitionCost === null) {
    fieldErrors.tuition_cost = "Enter a tuition cost of 0 or more.";
  }

  if (!depositDeadline) {
    fieldErrors.deposit_deadline = "Enter a deposit deadline.";
  }

  if (!status) {
    fieldErrors.status = "Select a status.";
  }

  return {
    universityId,
    financialAidAmount,
    tuitionCost,
    depositDeadline,
    status,
    fieldErrors,
  };
}

export async function logOffer(
  _prevState: OfferActionState | null,
  formData: FormData,
): Promise<OfferActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to log an offer." };
  }

  const fields = readOfferFields(formData);

  if (Object.keys(fields.fieldErrors).length > 0) {
    return { fieldErrors: fields.fieldErrors };
  }

  if (
    fields.financialAidAmount === null ||
    fields.tuitionCost === null ||
    !fields.status
  ) {
    return { error: "Enter valid offer details." };
  }

  const { error } = await supabase.from("admission_offers").insert({
    student_id: user.id,
    university_id: fields.universityId,
    financial_aid_amount: fields.financialAidAmount,
    tuition_cost: fields.tuitionCost,
    deposit_deadline: fields.depositDeadline,
    status: fields.status,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/offers");
  return { success: true };
}

export async function updateOffer(
  _prevState: OfferActionState | null,
  formData: FormData,
): Promise<OfferActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to update an offer." };
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { error: "Missing offer id." };
  }

  const fields = readOfferFields(formData);

  if (Object.keys(fields.fieldErrors).length > 0) {
    return { fieldErrors: fields.fieldErrors };
  }

  if (
    fields.financialAidAmount === null ||
    fields.tuitionCost === null ||
    !fields.status
  ) {
    return { error: "Enter valid offer details." };
  }

  const { error } = await supabase
    .from("admission_offers")
    .update({
      university_id: fields.universityId,
      financial_aid_amount: fields.financialAidAmount,
      tuition_cost: fields.tuitionCost,
      deposit_deadline: fields.depositDeadline,
      status: fields.status,
    })
    .eq("id", id)
    .eq("student_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/offers");
  return { success: true };
}

export async function deleteOffer(formData: FormData) {
  const { supabase, user } = await requireUser();

  if (!user) {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  await supabase
    .from("admission_offers")
    .delete()
    .eq("id", id)
    .eq("student_id", user.id);

  revalidatePath("/offers");
}
