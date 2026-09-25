"use server";

import { PARKED_MODULE_MESSAGE } from "@/domain/legacy/parked";

export interface OfferActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
}

export async function logOffer(
  prevState: OfferActionState | null,
  formData: FormData,
): Promise<OfferActionState> {
  void prevState;
  void formData;
  return { error: PARKED_MODULE_MESSAGE };
}

export async function updateOffer(
  prevState: OfferActionState | null,
  formData: FormData,
): Promise<OfferActionState> {
  void prevState;
  void formData;
  return { error: PARKED_MODULE_MESSAGE };
}

export async function deleteOffer(formData: FormData): Promise<void> {
  void formData;
}
