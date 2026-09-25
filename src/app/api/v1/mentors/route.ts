import { guestContext, resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import {
  listPublishedMentorsSql,
  mentorshipLeaderboardSql,
} from "@/server/modules/mentorship/commands";

export async function GET(request: Request) {
  const requestId = newRequestId();
  try {
    const url = new URL(request.url);
    const filters: Record<string, unknown> = {
      kind: url.searchParams.get("kind") ?? "alumni",
      topic: url.searchParams.get("topic") ?? "",
      university: url.searchParams.get("university") ?? "",
      sector: url.searchParams.get("sector") ?? "",
      experienceYears: url.searchParams.get("experienceYears") ?? "",
    };
    let context;
    try {
      context = await resolveRequestContext(requestId);
    } catch {
      context = guestContext(requestId);
    }
    const [mentors, monthly, annual] = await Promise.all([
      listPublishedMentorsSql(context, filters),
      mentorshipLeaderboardSql(context, "monthly"),
      mentorshipLeaderboardSql(context, "annual"),
    ]);
    return commandSuccess({ mentors, monthly, annual }, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
