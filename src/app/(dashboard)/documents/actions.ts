"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_TYPES, type DocumentType } from "@/types";

const BUCKET = "student-documents";

export interface DocumentActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    file?: string;
    document_type?: string;
  };
}

function parseDocumentType(value: string): DocumentType | null {
  for (const type of DOCUMENT_TYPES) {
    if (type === value) {
      return type;
    }
  }

  return null;
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || "document";
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function uploadDocument(
  _prevState: DocumentActionState | null,
  formData: FormData,
): Promise<DocumentActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to upload a document." };
  }

  const fileValue = formData.get("file");
  const documentType = parseDocumentType(
    String(formData.get("document_type") ?? ""),
  );
  const fieldErrors: NonNullable<DocumentActionState["fieldErrors"]> = {};

  if (!(fileValue instanceof File) || fileValue.size === 0) {
    fieldErrors.file = "Select a file to upload.";
  }

  if (!documentType) {
    fieldErrors.document_type = "Select a document type.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  if (!(fileValue instanceof File) || !documentType) {
    return { error: "Select a file and document type." };
  }

  const objectPath = `${user.id}/${crypto.randomUUID()}-${sanitizeFileName(fileValue.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, fileValue, {
      upsert: false,
      contentType: fileValue.type || undefined,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    user_id: user.id,
    file_name: fileValue.name,
    file_url: objectPath,
    document_type: documentType,
  });

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([objectPath]);
    return { error: insertError.message };
  }

  revalidatePath("/documents");
  return { success: true };
}

export async function deleteDocument(formData: FormData) {
  const { supabase, user } = await requireUser();

  if (!user) {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  const { data } = await supabase
    .from("documents")
    .select("id, file_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data || typeof data.file_url !== "string") {
    return;
  }

  if (data.file_url.startsWith(`${user.id}/`)) {
    await supabase.storage.from(BUCKET).remove([data.file_url]);
  }

  await supabase.from("documents").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/documents");
}
