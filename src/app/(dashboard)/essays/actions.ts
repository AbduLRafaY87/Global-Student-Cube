"use server";

import { PARKED_MODULE_MESSAGE } from "@/domain/legacy/parked";

export interface EssayActionState {
  error?: string;
  success?: boolean;
  word_count?: number;
  fieldErrors?: Record<string, string>;
}

export async function createEssay(
  prevState: EssayActionState | null,
  formData: FormData,
): Promise<EssayActionState> {
  void prevState;
  void formData;
  return { error: PARKED_MODULE_MESSAGE };
}

export async function updateEssay(
  prevState: EssayActionState | null,
  formData: FormData,
): Promise<EssayActionState> {
  void prevState;
  void formData;
  return { error: PARKED_MODULE_MESSAGE };
}

export async function deleteEssay(formData: FormData): Promise<void> {
  void formData;
}
