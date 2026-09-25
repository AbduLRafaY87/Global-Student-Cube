import { guestContext, resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  getMentorRequestSql,
  getPublishedMentorSql,
  listMentorRequestsSql,
  listPublishedMentorsSql,
  mentorDashboardSql,
  mentorshipLeaderboardSql,
  myAlumniMentorProfileSql,
  myParentMentorProfileSql,
  sessionMentoringSummarySql,
} from "./commands";

export type MentorshipLoad<T> =
  | { ok: true; data: T }
  | { ok: false; forbidden: boolean };

async function wrap<T>(run: () => Promise<T>): Promise<MentorshipLoad<T>> {
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

export async function loadPublishedMentors(filters: Record<string, unknown>) {
  return wrap(async () => {
    let context;
    try {
      context = await resolveRequestContext();
    } catch {
      context = guestContext();
    }
    const [mentors, monthly, annual] = await Promise.all([
      listPublishedMentorsSql(context, filters),
      mentorshipLeaderboardSql(context, "monthly"),
      mentorshipLeaderboardSql(context, "annual"),
    ]);
    return { mentors, monthly, annual };
  });
}

export async function loadPublishedMentor(mentorId: string) {
  return wrap(async () => {
    let context;
    try {
      context = await resolveRequestContext();
    } catch {
      context = guestContext();
    }
    return getPublishedMentorSql(context, mentorId);
  });
}

export async function loadAlumniMentorProfile() {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return myAlumniMentorProfileSql(context);
  });
}

export async function loadParentMentorProfile() {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return myParentMentorProfileSql(context);
  });
}

export async function loadMentorDashboard() {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return mentorDashboardSql(context);
  });
}

export async function loadMentorRequests(tab: string, requestId: string | null) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    const items = await listMentorRequestsSql(context, tab);
    const selected = requestId ? await getMentorRequestSql(context, requestId) : null;
    return { items, selected };
  });
}

export async function loadMentoringSummary(sessionId: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return sessionMentoringSummarySql(context, sessionId);
  });
}
