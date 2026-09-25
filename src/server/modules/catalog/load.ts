import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import { getCaseVisaGuidanceCommand } from "./commands";

export type CatalogLoad<T> =
  | { ok: true; data: T }
  | { ok: false; forbidden: boolean };

async function wrap<T>(run: () => Promise<T>): Promise<CatalogLoad<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (
      error instanceof CommandError &&
      (error.code === "FORBIDDEN" ||
        error.code === "AUTH_REQUIRED" ||
        error.code === "NOT_FOUND" ||
        error.code === "MFA_REQUIRED")
    ) {
      return { ok: false, forbidden: true };
    }
    return { ok: false, forbidden: false };
  }
}

export async function loadCaseVisaGuidance(caseId: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return getCaseVisaGuidanceCommand(context, caseId);
  });
}
