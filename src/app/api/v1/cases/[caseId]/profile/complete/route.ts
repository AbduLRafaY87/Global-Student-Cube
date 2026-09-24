import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { completeModule2Command } from "@/server/modules/profile/commands";

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId } = await params;
    const context = await resolveRequestContext(requestId);
    const result = await completeModule2Command(context, caseId);
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
