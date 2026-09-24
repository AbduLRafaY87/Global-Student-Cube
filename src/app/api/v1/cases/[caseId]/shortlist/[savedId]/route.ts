import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { removeSavedProgramCommand } from "@/server/modules/shortlist/commands";

interface RouteParams {
  params: Promise<{ caseId: string; savedId: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId, savedId } = await params;
    requireUuid(caseId, "caseId");
    requireUuid(savedId, "savedId");
    const context = await resolveRequestContext(requestId);
    const result = await removeSavedProgramCommand(context, caseId, savedId);
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
