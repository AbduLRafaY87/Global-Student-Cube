import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  getAdminContentSql,
  getLearningCourseSql,
  getLearningResourceSql,
  learningHomeSql,
  listAdminContentSql,
  listLearningLibrarySql,
} from "./commands";

export type LearningLoad<T> =
  | { ok: true; data: T }
  | { ok: false; forbidden: boolean };

async function wrap<T>(run: () => Promise<T>): Promise<LearningLoad<T>> {
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
      return { ok: false, forbidden: error.code !== "NOT_FOUND" };
    }
    return { ok: false, forbidden: false };
  }
}

export async function loadLearningHome(category: string, audience: string, search: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return learningHomeSql(context, category, audience, search);
  });
}

export async function loadLearningCourse(id: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return getLearningCourseSql(context, id);
  });
}

export async function loadLearningLibrary(search: string, category: string, fileType: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return listLearningLibrarySql(context, search, category, fileType);
  });
}

export async function loadLearningResource(id: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return getLearningResourceSql(context, id);
  });
}

export async function loadAdminContent(kind: string, state: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return listAdminContentSql(context, kind, state);
  });
}

export async function loadAdminContentItem(id: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return getAdminContentSql(context, id);
  });
}
