import type {
  CreateJoinTokenInput,
  CreateRoomInput,
  VideoJoinToken,
  VideoProvider,
  VideoRecordingHandle,
  VideoRoom,
} from "@/domain/sessions/video";

class SandboxVideoProvider implements VideoProvider {
  readonly id = "sandbox" as const;
  readonly canEnforceRosterSafeRecording = false;

  async createRoom(input: CreateRoomInput): Promise<VideoRoom> {
    return {
      roomName: `gsc-sandbox-${input.bookingId.slice(0, 8)}-${input.generation}`,
      roomUrl: `https://sandbox.invalid/rooms/${input.bookingId}`,
      generation: input.generation,
      recordingEnabled: false,
    };
  }

  async createJoinToken(input: CreateJoinTokenInput): Promise<VideoJoinToken> {
    return {
      token: `sandbox.${input.roomName}.${input.participantId}`,
      expiresAt: input.expiresAt,
      roomName: input.roomName,
    };
  }

  async startRecording(): Promise<VideoRecordingHandle> {
    throw new Error("SANDBOX_RECORDING_DISABLED");
  }

  async stopRecording(): Promise<void> {
    return;
  }

  async deleteRecording(): Promise<void> {
    return;
  }
}

class DailyVideoProvider implements VideoProvider {
  readonly id = "daily" as const;
  readonly canEnforceRosterSafeRecording = true;

  constructor(private readonly apiKey: string) {}

  async createRoom(input: CreateRoomInput): Promise<VideoRoom> {
    const roomName = `gsc-${input.bookingId.slice(0, 8)}-${input.generation}`;
    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          enable_knocking: true,
          enable_recording: input.recordingCapable ? "cloud" : false,
          start_video_off: false,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
          eject_at_room_exp: true,
        },
      }),
    });
    if (!response.ok) {
      throw new Error("DAILY_ROOM_FAILED");
    }
    const body = (await response.json()) as { name?: string; url?: string };
    return {
      roomName: body.name ?? roomName,
      roomUrl: body.url ?? `https://api.daily.co/${roomName}`,
      generation: input.generation,
      recordingEnabled: false,
    };
  }

  async createJoinToken(input: CreateJoinTokenInput): Promise<VideoJoinToken> {
    const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: input.roomName,
          user_id: input.participantId,
          user_name: input.displayName,
          is_owner: input.isOwner,
          nbf: Math.floor(Date.parse(input.notBefore) / 1000),
          exp: Math.floor(Date.parse(input.expiresAt) / 1000),
          enable_recording: false,
        },
      }),
    });
    if (!response.ok) {
      throw new Error("DAILY_TOKEN_FAILED");
    }
    const body = (await response.json()) as { token?: string };
    if (!body.token) {
      throw new Error("DAILY_TOKEN_FAILED");
    }
    return {
      token: body.token,
      expiresAt: input.expiresAt,
      roomName: input.roomName,
    };
  }

  async startRecording(roomName: string): Promise<VideoRecordingHandle> {
    const response = await this.daily("POST", `/rooms/${roomName}/recordings/start`, {});
    const body = (await response.json()) as { recordingId?: string; id?: string };
    const recordingId = body.recordingId ?? body.id;
    if (!recordingId) {
      throw new Error("DAILY_RECORDING_START_FAILED");
    }
    return { recordingId };
  }

  async stopRecording(recordingId: string): Promise<void> {
    const response = await this.daily("POST", `/recordings/${recordingId}/stop`, {});
    if (!response.ok) {
      throw new Error("DAILY_RECORDING_STOP_FAILED");
    }
  }

  async deleteRecording(recordingId: string): Promise<void> {
    const response = await this.daily("DELETE", `/recordings/${recordingId}`);
    if (!response.ok && response.status !== 404) {
      throw new Error("DAILY_RECORDING_DELETE_FAILED");
    }
  }

  private async daily(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Response> {
    return fetch(`https://api.daily.co/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export function videoProviderFromConfig(
  provider = process.env.GSC_VIDEO_PROVIDER,
  apiKey = process.env.DAILY_API_KEY,
): VideoProvider {
  if (provider === "daily" && apiKey) {
    return new DailyVideoProvider(apiKey);
  }
  return new SandboxVideoProvider();
}
