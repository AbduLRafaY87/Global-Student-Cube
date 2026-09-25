import {
  canStartRecording,
  type RecordingConsentEvent,
  type RecordingState,
} from "@/domain/sessions/consent";
import { isRecordingFeatureEnabled } from "@/domain/sessions/features";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { videoProviderFromConfig } from "@/server/integrations/video";
import { requireUuid } from "@/server/modules/admin/http";
import {
  sessionWorkspaceSql,
  startSessionRecordingSql,
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
    if (context.role === "counselor" && context.assurance !== "aal2") {
      throw new CommandError("MFA_REQUIRED", "Confirm your authenticator to continue.");
    }
    const session = await sessionWorkspaceSql(context, sessionId);
    const provider = videoProviderFromConfig();
    const events: RecordingConsentEvent[] = session.participants
      .filter((row) => row.consent === "yes")
      .map((row) => ({
        participantId: row.accountId,
        rosterVersion: session.rosterVersion,
        decision: true,
        occurredAt: session.startsAt,
        guardianConsentEventId: null,
      }));
    if (
      !canStartRecording({
        recordingState: session.recordingState as RecordingState,
        rosterVersion: session.rosterVersion,
        presentParticipantIds: session.participants.map((row) => row.accountId),
        events,
        isMinorStudent: session.isMinor,
        guardianConsented: session.guardianConsented,
        recordingFeatureEnabled: isRecordingFeatureEnabled(
          process.env.GSC_FEATURE_RECORDING_AI,
        ),
        adapterCanEnforceRoster: provider.canEnforceRosterSafeRecording,
      })
    ) {
      throw new CommandError("VALIDATION_FAILED", "Recording stays off until every present participant consents.");
    }
    if (session.actorRole !== "counselor" && session.actorRole !== "mentor") {
      throw new CommandError("FORBIDDEN", "Only the session host can start recording.");
    }
    const roomName = session.room?.roomUrl?.split("/").pop();
    if (!roomName) {
      throw new CommandError("DEPENDENCY_UNAVAILABLE", "The meeting room is still being prepared.");
    }
    const started = await provider.startRecording(roomName);
    const workspace = await startSessionRecordingSql(
      context,
      sessionId,
      started.recordingId,
    );
    return commandSuccess(workspace, requestId, { status: 202 });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
