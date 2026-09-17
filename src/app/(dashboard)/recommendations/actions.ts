"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  RECOMMENDATION_STATUSES,
  type RecommendationStatus,
} from "@/types";

export interface RecommendationActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    recommender_name?: string;
    recommender_email?: string;
    recommender_title?: string;
    relationship?: string;
    status?: string;
    deadline?: string;
  };
}

function parseRecommendationStatus(value: string): RecommendationStatus | null {
  for (const status of RECOMMENDATION_STATUSES) {
    if (status === value) {
      return status;
    }
  }

  return null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = Date.parse(`${value}T00:00:00`);
  return !Number.isNaN(parsed);
}

export async function requestRecommendation(
  _prevState: RecommendationActionState | null,
  formData: FormData,
): Promise<RecommendationActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to request a recommendation." };
  }

  const recommenderName = String(formData.get("recommender_name") ?? "").trim();
  const recommenderEmail = String(formData.get("recommender_email") ?? "")
    .trim()
    .toLowerCase();
  const recommenderTitle = String(formData.get("recommender_title") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "").trim();
  const status = parseRecommendationStatus(String(formData.get("status") ?? ""));
  const deadline = String(formData.get("deadline") ?? "").trim();
  const fieldErrors: NonNullable<RecommendationActionState["fieldErrors"]> = {};

  if (!recommenderName) {
    fieldErrors.recommender_name = "Enter the recommender name.";
  }

  if (!recommenderEmail || !isValidEmail(recommenderEmail)) {
    fieldErrors.recommender_email = "Enter a valid recommender email.";
  }

  if (!recommenderTitle) {
    fieldErrors.recommender_title = "Enter the recommender title.";
  }

  if (!relationship) {
    fieldErrors.relationship = "Enter your relationship to the recommender.";
  }

  if (!status) {
    fieldErrors.status = "Select a status.";
  }

  if (!deadline || !isValidDate(deadline)) {
    fieldErrors.deadline = "Enter a valid deadline.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  if (!status) {
    return { error: "Select a valid status." };
  }

  const { error } = await supabase.from("recommendations").insert({
    student_id: user.id,
    recommender_name: recommenderName,
    recommender_email: recommenderEmail,
    recommender_title: recommenderTitle,
    relationship,
    status,
    deadline,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/recommendations");
  return { success: true };
}
