import { guestContext, resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  getModerationSql,
  getNewsArticleSql,
  getPublicStorySql,
  listCounselorNewsSql,
  listModerationSql,
  listPublicStoriesSql,
  newsFeedSql,
} from "./commands";

export type NewsLoad<T> =
  | { ok: true; data: T }
  | { ok: false; forbidden: boolean };

async function wrap<T>(run: () => Promise<T>): Promise<NewsLoad<T>> {
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

async function memberOrGuest() {
  try {
    return await resolveRequestContext();
  } catch {
    return guestContext();
  }
}

export async function loadNewsFeed(
  tab: string,
  topic: string,
  search: string,
  page: number,
) {
  return wrap(async () => newsFeedSql(await memberOrGuest(), tab, topic, search, page));
}

export async function loadNewsArticle(id: string) {
  return wrap(async () => getNewsArticleSql(await memberOrGuest(), id));
}

export async function loadCounselorNews() {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return listCounselorNewsSql(context);
  });
}

export async function loadPublicStories(country: string, topic: string, search: string) {
  return wrap(async () =>
    listPublicStoriesSql(await memberOrGuest(), country, topic, search),
  );
}

export async function loadPublicStory(id: string) {
  return wrap(async () => getPublicStorySql(await memberOrGuest(), id));
}

export async function loadModerationQueue(queue: string, severity: string, status: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return listModerationSql(context, queue, severity, status);
  });
}

export async function loadModerationReview(id: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return getModerationSql(context, id);
  });
}
