"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface MessageActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    receiver_id?: string;
    content?: string;
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

async function isAssignedPair(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  counterpartId: string,
): Promise<boolean> {
  const [{ data: asStudent }, { data: asCounselor }] = await Promise.all([
    supabase
      .from("counselor_assignments")
      .select("id")
      .eq("student_id", userId)
      .eq("counselor_id", counterpartId)
      .maybeSingle(),
    supabase
      .from("counselor_assignments")
      .select("id")
      .eq("counselor_id", userId)
      .eq("student_id", counterpartId)
      .maybeSingle(),
  ]);

  return Boolean(asStudent || asCounselor);
}

export async function sendMessage(
  _prevState: MessageActionState | null,
  formData: FormData,
): Promise<MessageActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to send a message." };
  }

  const receiverId = String(formData.get("receiver_id") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const fieldErrors: NonNullable<MessageActionState["fieldErrors"]> = {};

  if (!isUuid(receiverId)) {
    fieldErrors.receiver_id = "Choose a valid recipient.";
  }

  if (!content) {
    fieldErrors.content = "Enter a message.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  if (receiverId === user.id) {
    return { error: "You cannot message yourself." };
  }

  const assigned = await isAssignedPair(supabase, user.id, receiverId);

  if (!assigned) {
    return {
      error: "You can only message your assigned counselor or students.",
    };
  }

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    receiver_id: receiverId,
    content,
    read: false,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/messages");
  return { success: true };
}

export async function markMessagesAsRead(senderId: string): Promise<void> {
  const { supabase, user } = await requireUser();

  if (!user || !isUuid(senderId) || senderId === user.id) {
    return;
  }

  const assigned = await isAssignedPair(supabase, user.id, senderId);

  if (!assigned) {
    return;
  }

  await supabase
    .from("messages")
    .update({ read: true })
    .eq("receiver_id", user.id)
    .eq("sender_id", senderId)
    .eq("read", false);
}
