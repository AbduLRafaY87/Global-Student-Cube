import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { authorizeInboxChannelSql } from "@/server/modules/messaging/commands";

export async function POST() {
  const requestId = newRequestId();
  try {
    const context = await resolveRequestContext(requestId);
    return commandSuccess(await authorizeInboxChannelSql(context), requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
