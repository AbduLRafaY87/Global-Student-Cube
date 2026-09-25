"use server";

import { PARKED_MODULE_MESSAGE } from "@/domain/legacy/parked";

export interface RecommendationActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
}

export async function requestRecommendation(
  prevState: RecommendationActionState | null,
  formData: FormData,
): Promise<RecommendationActionState> {
  void prevState;
  void formData;
  return { error: PARKED_MODULE_MESSAGE };
}
