import { joinWindowOpen } from "@/domain/sessions/attendance";
import { isRecordingFeatureEnabled } from "@/domain/sessions/features";
import { tokenWindow } from "@/domain/sessions/video";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { videoProviderFromConfig } from "@/server/integrations/video";
import { requireUuid } from "@/server/modules/admin/http";
import {
  bumpSessionRosterSql,
  recordSessionEventSql,
  saveMeetingRoomSql,
  sessionWorkspaceSql,
  stopSessionRecordingSql,
  transitionSessionSql,
} from "@/server/modules/sessions/commands";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { sessionId } = await params;
    requireUuid(sessionId, "sessionId");
    const context = await resolveRequestContext(requestId);
    const session = await sessionWorkspaceSql(context, sessionId);
    const now = new Date().toISOString();

    if (session.status !== "confirmed") {
      throw new CommandError("VALIDATION_FAILED", "This appointment is not confirmed.");
    }
    if (!joinWindowOpen(session.startsAt, now)) {
      throw new CommandError(
        "VALIDATION_FAILED",
        "Join opens 10 minutes before the scheduled start.",
      );
    }

    if (session.sessionState === "scheduled") {
      await transitionSessionSql(context, sessionId, "open_join_window");
    }

    const provider = videoProviderFromConfig();
    const generation = session.room?.generation ?? 1;
    let roomUrl = session.room?.state === "ready" ? session.room.roomUrl : null;
    let roomName = session.room?.roomUrl?.split("/").pop() ?? "";

    const actor = session.participants.find((row) => row.accountId === context.accountId);
    if (actor?.consent === "pending" && session.recordingState === "recording") {
      const recordingId = session.currentRecording?.providerRecordingId;
      if (recordingId) {
        try {
          await provider.stopRecording(recordingId);
        } catch {
          // Consent withdrawal still stops our recording state below.
        }
      }
      await stopSessionRecordingSql(context, sessionId, false);
      await bumpSessionRosterSql(context, sessionId);
    }

    if (session.room?.state !== "ready" || !roomUrl) {
      try {
        const created = await provider.createRoom({
          bookingId: sessionId,
          generation,
          recordingCapable:
            isRecordingFeatureEnabled(process.env.GSC_FEATURE_RECORDING_AI) &&
            provider.canEnforceRosterSafeRecording,
        });
        await saveMeetingRoomSql(context, {
          bookingId: sessionId,
          provider: provider.id,
          externalId: created.roomName,
          url: created.roomUrl,
          generation: created.generation,
          state: "ready",
        });
        roomUrl = created.roomUrl;
        roomName = created.roomName;
      } catch {
        await saveMeetingRoomSql(context, {
          bookingId: sessionId,
          provider: provider.id,
          externalId: `pending-${sessionId}`,
          url: "",
          generation,
          state: "preparing",
        });
        throw new CommandError(
          "DEPENDENCY_UNAVAILABLE",
          "The meeting is confirmed. The video link is still being prepared.",
        );
      }
    }

    const window = tokenWindow(session.startsAt, session.endsAt);
    const issued = await provider.createJoinToken({
      roomName: roomName || sessionId,
      participantId: context.accountId,
      displayName: session.actorRole,
      isOwner: session.actorRole === "counselor" || session.actorRole === "mentor",
      notBefore: window.notBefore,
      expiresAt: window.expiresAt,
    });

    await recordSessionEventSql(
      context,
      sessionId,
      "join_token_issued",
      "manual_reviewed",
      `join-token:${sessionId}:${context.accountId}:${requestId}`,
    );

    return commandSuccess(
      {
        roomUrl,
        expiresAt: issued.expiresAt,
        token: issued.token,
        recordingEnabled:
          isRecordingFeatureEnabled(process.env.GSC_FEATURE_RECORDING_AI) &&
          provider.canEnforceRosterSafeRecording,
        provider: provider.id,
      },
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
