import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import {
  getDataRequestCommand,
  processDeletionCommand,
} from "@/server/modules/privacy/commands";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await getDataRequestCommand(context, requireUuid(id, "id")),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}

export async function POST(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await processDeletionCommand(context, requireUuid(id, "id")),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
