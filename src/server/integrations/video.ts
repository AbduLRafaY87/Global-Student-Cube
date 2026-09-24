import type {
  CreateJoinTokenInput,
  VideoJoinToken,
  VideoProvider,
  VideoRoom,
} from "@/domain/sessions/video";

class SandboxVideoProvider implements VideoProvider {
  readonly id = "sandbox" as const;
  readonly canEnforceRosterSafeRecording = false;

  async createRoom(bookingId: string, generation: number): Promise<VideoRoom> {
    return {
      roomName: `gsc-sandbox-${bookingId.slice(0, 8)}-${generation}`,
      roomUrl: `https://sandbox.invalid/rooms/${bookingId}`,
      generation,
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
}

class DailyVideoProvider implements VideoProvider {
  readonly id = "daily" as const;
  readonly canEnforceRosterSafeRecording = false;

  constructor(private readonly apiKey: string) {}

  async createRoom(bookingId: string, generation: number): Promise<VideoRoom> {
    const roomName = `gsc-${bookingId.slice(0, 8)}-${generation}`;
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
          enable_recording: false,
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
      generation,
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
