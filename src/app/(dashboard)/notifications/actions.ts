"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/server/modules/admin/http";
import { resolveRequestContext } from "@/server/context";
import {
  clearNotificationsCommand,
  markNotificationsReadCommand,
} from "@/server/modules/legacy/notifications";

export async function markNotificationRead(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!isUuid(id)) {
    return;
  }
  const context = await resolveRequestContext();
  await markNotificationsReadCommand(context, id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const context = await resolveRequestContext();
  await markNotificationsReadCommand(context, null);
  revalidatePath("/notifications");
}

export async function clearNotification(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!isUuid(id)) {
    return;
  }
  const context = await resolveRequestContext();
  await clearNotificationsCommand(context, id);
  revalidatePath("/notifications");
}

export async function clearAlerts() {
  const context = await resolveRequestContext();
  await clearNotificationsCommand(context, null);
  revalidatePath("/notifications");
}
