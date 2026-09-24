import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";

export type AdminLoad<T> =
  | { ok: true; data: T }
  | { ok: false; forbidden: boolean };

export async function loadAdminCommand<T>(
  run: (
    context: Awaited<ReturnType<typeof resolveRequestContext>>,
  ) => Promise<T>,
): Promise<AdminLoad<T>> {
  try {
    const context = await resolveRequestContext();
    return { ok: true, data: await run(context) };
  } catch (error) {
    if (
      error instanceof CommandError &&
      (error.code === "FORBIDDEN" || error.code === "MFA_REQUIRED")
    ) {
      return { ok: false, forbidden: true };
    }
    return { ok: false, forbidden: false };
  }
}
