"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ESSAY_STATUSES, type EssayStatus } from "@/types";

export interface EssayActionState {
  error?: string;
  success?: boolean;
  word_count?: number;
  fieldErrors?: {
    title?: string;
    prompt?: string;
    content?: string;
    word_limit?: string;
    status?: string;
    university_id?: string;
  };
}

function countWords(content: string): number {
  const trimmed = content.trim();
  if (trimmed === "") {
    return 0;
  }

  return trimmed.split(/\s+/).filter((word) => word.length > 0).length;
}

function parseEssayStatus(value: string): EssayStatus | null {
  for (const status of ESSAY_STATUSES) {
    if (status === value) {
      return status;
    }
  }

  return null;
}

function parseWordLimit(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseUniversityId(value: FormDataEntryValue | null): string | null {
  const universityId = String(value ?? "").trim();
  return universityId === "" ? null : universityId;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

function readEssayFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const wordLimit = parseWordLimit(formData.get("word_limit"));
  const status = parseEssayStatus(String(formData.get("status") ?? ""));
  const universityId = parseUniversityId(formData.get("university_id"));
  const fieldErrors: NonNullable<EssayActionState["fieldErrors"]> = {};

  if (!title) {
    fieldErrors.title = "Enter a title.";
  }

  if (!prompt) {
    fieldErrors.prompt = "Enter the essay prompt.";
  }

  if (wordLimit === null) {
    fieldErrors.word_limit = "Enter a word limit greater than 0.";
  }

  if (!status) {
    fieldErrors.status = "Select a status.";
  }

  return {
    title,
    prompt,
    content,
    wordLimit,
    status,
    universityId,
    wordCount: countWords(content),
    fieldErrors,
  };
}

export async function createEssay(
  _prevState: EssayActionState | null,
  formData: FormData,
): Promise<EssayActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to create an essay." };
  }

  const fields = readEssayFields(formData);

  if (Object.keys(fields.fieldErrors).length > 0) {
    return { fieldErrors: fields.fieldErrors, word_count: fields.wordCount };
  }

  if (!fields.status || fields.wordLimit === null) {
    return { error: "Enter a valid status and word limit." };
  }

  const { error } = await supabase.from("essays").insert({
    student_id: user.id,
    university_id: fields.universityId,
    title: fields.title,
    prompt: fields.prompt,
    content: fields.content,
    word_limit: fields.wordLimit,
    status: fields.status,
  });

  if (error) {
    return { error: error.message, word_count: fields.wordCount };
  }

  revalidatePath("/essays");
  return { success: true, word_count: fields.wordCount };
}

export async function updateEssay(
  _prevState: EssayActionState | null,
  formData: FormData,
): Promise<EssayActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to update an essay." };
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { error: "Missing essay id." };
  }

  const fields = readEssayFields(formData);

  if (Object.keys(fields.fieldErrors).length > 0) {
    return { fieldErrors: fields.fieldErrors, word_count: fields.wordCount };
  }

  if (!fields.status || fields.wordLimit === null) {
    return { error: "Enter a valid status and word limit." };
  }

  const { error } = await supabase
    .from("essays")
    .update({
      university_id: fields.universityId,
      title: fields.title,
      prompt: fields.prompt,
      content: fields.content,
      word_limit: fields.wordLimit,
      status: fields.status,
    })
    .eq("id", id)
    .eq("student_id", user.id);

  if (error) {
    return { error: error.message, word_count: fields.wordCount };
  }

  revalidatePath("/essays");
  return { success: true, word_count: fields.wordCount };
}

export async function deleteEssay(formData: FormData) {
  const { supabase, user } = await requireUser();

  if (!user) {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  await supabase.from("essays").delete().eq("id", id).eq("student_id", user.id);

  revalidatePath("/essays");
}
