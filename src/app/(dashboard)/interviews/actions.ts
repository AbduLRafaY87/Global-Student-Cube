"use server";

import { PARKED_MODULE_MESSAGE } from "@/domain/legacy/parked";

export interface InterviewActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
}

export async function logInterview(
  prevState: InterviewActionState | null,
  formData: FormData,
): Promise<InterviewActionState> {
  void prevState;
  void formData;
  return { error: PARKED_MODULE_MESSAGE };
}

export async function updateInterview(
  prevState: InterviewActionState | null,
  formData: FormData,
): Promise<InterviewActionState> {
  void prevState;
  void formData;
  return { error: PARKED_MODULE_MESSAGE };
}
