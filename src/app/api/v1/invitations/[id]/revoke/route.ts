import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { revokeInvitationSql } from "@/server/modules/identity/invitations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();

  try {
    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    if (context.role !== "admin") {
      throw new CommandError("FORBIDDEN", "You cannot perform this action.");
    }
    if (context.assurance !== "aal2") {
      throw new CommandError(
        "MFA_REQUIRED",
        "Confirm your authenticator to continue.",
      );
    }

    await revokeInvitationSql(context, id);
    return commandSuccess({ id, revoked: true }, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
