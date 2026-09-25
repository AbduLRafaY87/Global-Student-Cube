import { isRecordingFeatureEnabled } from "@/domain/sessions/features";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { videoProviderFromConfig } from "@/server/integrations/video";
import { requireUuid } from "@/server/modules/admin/http";
import {
  sessionWorkspaceSql,
  stopSessionRecordingSql,
} from "@/server/modules/sessions/commands";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { sessionId } = await params;
    requireUuid(sessionId, "sessionId");
    const context = await resolveRequestContext(requestId);
    const session = await sessionWorkspaceSql(context, sessionId);
    if (session.actorRole !== "counselor" && session.actorRole !== "mentor") {
      throw new CommandError("FORBIDDEN", "Only the session host can stop recording.");
    }
    const recordingId = session.currentRecording?.providerRecordingId;
    if (recordingId) {
      try {
        await videoProviderFromConfig().stopRecording(recordingId);
      } catch {
        // Local stop still writes deletion schedule and the manual summary remains.
      }
    }
    const workspace = await stopSessionRecordingSql(
      context,
      sessionId,
      isRecordingFeatureEnabled(process.env.GSC_FEATURE_RECORDING_AI),
    );
    return commandSuccess(workspace, requestId, { status: 202 });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
