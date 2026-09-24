import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

export interface BookmarkScholarshipPayload {
  id: string;
  caseId: string;
  scholarshipId: string;
  created: boolean;
  addedFunding: boolean;
}

export async function bookmarkScholarshipCommand(
  context: RequestContext,
  caseId: string,
  scholarshipId: string,
): Promise<BookmarkScholarshipPayload> {
  const row = await queryCommand<{ payload: BookmarkScholarshipPayload }>(
    context,
    `SELECT commands.bookmark_scholarship($1, $2) AS payload`,
    [caseId, scholarshipId],
  );
  return row.payload;
}
