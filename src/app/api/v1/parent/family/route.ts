import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { listParentFamilyCommand } from "@/server/modules/parent/commands";

export async function GET() {
  const requestId = newRequestId();
  try {
    const context = await resolveRequestContext(requestId);
    const result = await listParentFamilyCommand(context);
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
