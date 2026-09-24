import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  caseTasksSql,
  counselorAdvisorySql,
  counselorCaseloadSql,
  counselorHomeSql,
  studentAdvisorySql,
} from "./commands";

export type CounselingLoad<T> =
  | { ok: true; data: T }
  | { ok: false; forbidden: boolean };

async function wrap<T>(run: () => Promise<T>): Promise<CounselingLoad<T>> {
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

export async function loadCounselorHome() {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return counselorHomeSql(context);
  });
}

export async function loadCounselorCaseload(caseId: string | null) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return counselorCaseloadSql(context, caseId);
  });
}

export async function loadCounselorAdvisory(bookingId: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return counselorAdvisorySql(context, bookingId);
  });
}

export async function loadStudentAdvisory(bookingId: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return studentAdvisorySql(context, bookingId);
  });
}

export async function loadCaseTasks(caseId: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return caseTasksSql(context, caseId);
  });
}
