"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TASK_PRIORITIES, type TaskPriority } from "@/types";

export interface TaskActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    title?: string;
    due_date?: string;
    priority?: string;
  };
}

function parseTaskPriority(value: string): TaskPriority | null {
  for (const priority of TASK_PRIORITIES) {
    if (priority === value) {
      return priority;
    }
  }

  return null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function addTask(
  _prevState: TaskActionState | null,
  formData: FormData,
): Promise<TaskActionState> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "You must be signed in to add a task." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const priority = parseTaskPriority(String(formData.get("priority") ?? ""));
  const fieldErrors: NonNullable<TaskActionState["fieldErrors"]> = {};

  if (!title) {
    fieldErrors.title = "Enter a task title.";
  }

  if (!dueDate) {
    fieldErrors.due_date = "Enter a due date.";
  }

  if (!priority) {
    fieldErrors.priority = "Select a priority.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  if (!priority) {
    return { error: "Select a valid priority." };
  }

  const { error } = await supabase.from("tasks").insert({
    student_id: user.id,
    title,
    due_date: dueDate,
    is_completed: false,
    priority,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tasks");
  return { success: true };
}

export async function toggleTaskCompletion(formData: FormData) {
  const { supabase, user } = await requireUser();

  if (!user) {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  const { data } = await supabase
    .from("tasks")
    .select("is_completed")
    .eq("id", id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!data) {
    return;
  }

  await supabase
    .from("tasks")
    .update({ is_completed: data.is_completed !== true })
    .eq("id", id)
    .eq("student_id", user.id);

  revalidatePath("/tasks");
}

export async function deleteTask(formData: FormData) {
  const { supabase, user } = await requireUser();

  if (!user) {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  await supabase.from("tasks").delete().eq("id", id).eq("student_id", user.id);

  revalidatePath("/tasks");
}
