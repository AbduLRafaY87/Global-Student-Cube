import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import { sessionWorkspaceSql, type SessionWorkspace } from "./commands";

export type SessionLoad =
  | { ok: true; data: SessionWorkspace }
  | { ok: false; forbidden: boolean };

export async function loadSessionWorkspace(
  bookingId: string,
): Promise<SessionLoad> {
  try {
    const context = await resolveRequestContext();
    return { ok: true, data: await sessionWorkspaceSql(context, bookingId) };
  } catch (error) {
    if (
      error instanceof CommandError &&
      (error.code === "FORBIDDEN" ||
        error.code === "AUTH_REQUIRED" ||
        error.code === "NOT_FOUND")
    ) {
      return { ok: false, forbidden: true };
    }
    return { ok: false, forbidden: false };
  }
}
