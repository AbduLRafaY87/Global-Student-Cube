import { createClient } from "@/lib/supabase/server";
import { loadSaveContext } from "@/server/modules/shortlist/load";

export interface ScholarshipBookmarkContext {
  caseId: string;
  canWrite: boolean;
  scholarshipIds: string[];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function loadScholarshipBookmarks(
  caseId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_scholarship_bookmarks")
    .select("scholarship_id")
    .eq("case_id", caseId);
  const ids: string[] = [];
  for (const raw of data ?? []) {
    const id = asString((raw as Record<string, unknown>).scholarship_id);
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}

export async function loadScholarshipBookmarkContext(
  userId: string,
): Promise<ScholarshipBookmarkContext | null> {
  const saveContext = await loadSaveContext(userId);
  if (!saveContext) {
    return null;
  }
  const scholarshipIds = await loadScholarshipBookmarks(saveContext.caseId);
  return {
    caseId: saveContext.caseId,
    canWrite: saveContext.canWrite,
    scholarshipIds,
  };
}
