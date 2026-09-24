"use server";

import { revalidatePath } from "next/cache";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import { canonicalHash, pathHash } from "@/server/http/body";
import { parseFormVersion } from "@/server/http/headers";
import {
  createApplicationCommand,
  deleteApplicationCommand,
  updateApplicationCommand,
} from "@/server/modules/applications/commands";

export interface ApplicationActionState {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    university_id?: string;
    status?: string;
    deadline?: string;
  };
}

function parseApplicationStatus(value: string): ApplicationStatus | null {
  for (const status of APPLICATION_STATUSES) {
    if (status === value) {
      return status;
    }
  }
  return null;
}

function formError(error: unknown): ApplicationActionState {
  if (error instanceof CommandError) {
    return { error: error.message };
  }
  return { error: "Unable to save the application. Please try again." };
}

export async function createApplication(
  _prevState: ApplicationActionState | null,
  formData: FormData,
): Promise<ApplicationActionState> {
  const universityId = String(formData.get("university_id") ?? "").trim();
  const status = parseApplicationStatus(String(formData.get("status") ?? ""));
  const deadline = String(formData.get("deadline") ?? "").trim();
  const fieldErrors: NonNullable<ApplicationActionState["fieldErrors"]> = {};

  if (!universityId) {
    fieldErrors.university_id = "Select a university.";
  }

  if (!status) {
    fieldErrors.status = "Select a status.";
  }

  if (!deadline) {
    fieldErrors.deadline = "Enter a deadline.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  if (!status) {
    return { error: "Select a valid status." };
  }

  try {
    const context = await resolveRequestContext();
    const canonical = { universityId, status, deadline };
    await createApplicationCommand(context, {
      universityId,
      status,
      deadline,
      idempotencyKey: crypto.randomUUID(),
      requestHash: canonicalHash(canonical),
      pathHash: pathHash("/api/v1/applications"),
    });
  } catch (error) {
    return formError(error);
  }

  revalidatePath("/applications");
  return { success: true };
}

export async function updateApplicationStatus(
  _prevState: ApplicationActionState | null,
  formData: FormData,
): Promise<ApplicationActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const status = parseApplicationStatus(String(formData.get("status") ?? ""));
  const universityId = String(formData.get("university_id") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();
  const fieldErrors: NonNullable<ApplicationActionState["fieldErrors"]> = {};

  if (!id) {
    return { error: "Missing application id." };
  }

  if (!status) {
    fieldErrors.status = "Select a status.";
  }

  if (universityId === "" && formData.has("university_id")) {
    fieldErrors.university_id = "Select a university.";
  }

  if (deadline === "" && formData.has("deadline")) {
    fieldErrors.deadline = "Enter a deadline.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  if (!status) {
    return { error: "Select a valid status." };
  }

  try {
    const context = await resolveRequestContext();
    const expectedVersion = parseFormVersion(formData.get("version"));
    await updateApplicationCommand(context, {
      id,
      expectedVersion,
      universityId: universityId || null,
      status,
      deadline: deadline || null,
    });
  } catch (error) {
    return formError(error);
  }

  revalidatePath("/applications");
  return { success: true };
}

export async function deleteApplication(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return;
  }

  try {
    const context = await resolveRequestContext();
    const expectedVersion = parseFormVersion(formData.get("version"));
    await deleteApplicationCommand(context, { id, expectedVersion });
  } catch {
    return;
  }

  revalidatePath("/applications");
}
