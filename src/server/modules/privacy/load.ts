import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  adminAnalyticsCommand,
  getDataRequestCommand,
  getSupportRequestCommand,
  listMyConsentsCommand,
  listMyDataRequestsCommand,
  listMySupportRequestsCommand,
  listSecurityEventsCommand,
  myAccountSettingsCommand,
} from "./commands";

export type PrivacyLoad<T> =
  | { ok: true; data: T }
  | { ok: false; forbidden: boolean };

async function wrap<T>(run: () => Promise<T>): Promise<PrivacyLoad<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (
      error instanceof CommandError &&
      (error.code === "FORBIDDEN" ||
        error.code === "AUTH_REQUIRED" ||
        error.code === "MFA_REQUIRED" ||
        error.code === "NOT_FOUND")
    ) {
      return { ok: false, forbidden: true };
    }
    return { ok: false, forbidden: false };
  }
}

export async function loadAccountSettings() {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return myAccountSettingsCommand(context);
  });
}

export async function loadPrivacyWorkspace() {
  return wrap(async () => {
    const context = await resolveRequestContext();
    const [consents, requests] = await Promise.all([
      listMyConsentsCommand(context),
      listMyDataRequestsCommand(context),
    ]);
    return { consents, requests };
  });
}

export async function loadSecurityWorkspace() {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return listSecurityEventsCommand(context);
  });
}

export async function loadHelpWorkspace(requestId: string | null) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    const list = await listMySupportRequestsCommand(context);
    const selected = requestId ? await getSupportRequestCommand(context, requestId) : null;
    return { list, selected };
  });
}

export async function loadDataRequest(id: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return getDataRequestCommand(context, id);
  });
}

export async function loadAdminAnalytics(from: string | null, to: string | null) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return adminAnalyticsCommand(context, from, to);
  });
}
