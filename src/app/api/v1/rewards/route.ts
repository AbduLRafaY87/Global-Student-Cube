import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { rewardHomeSql } from "@/server/modules/rewards/commands";

export async function GET() {
  const requestId = newRequestId();
  try {
    const context = await resolveRequestContext(requestId);
    return commandSuccess(await rewardHomeSql(context), requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
