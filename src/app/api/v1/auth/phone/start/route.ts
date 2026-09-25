import { sha256Hex } from "@/domain/identity/hash";
import { formatE164, phoneHashInput, validatePhoneParts } from "@/domain/identity/phone";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { phoneVerifyProvider } from "@/server/integrations/verify";
import { startPhoneChallengeCommand } from "@/server/modules/privacy/commands";

const ALLOWED_KEYS = ["countryCode", "national"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const country = typeof body.countryCode === "string" ? body.countryCode : "";
    const national = typeof body.national === "string" ? body.national : "";
    const invalid = validatePhoneParts(country, national, true);
    if (invalid) {
      throw new CommandError("VALIDATION_FAILED", invalid);
    }
    const e164 = formatE164(country, national);
    const provider = phoneVerifyProvider();
    if (provider.id !== "twilio") {
      throw new CommandError(
        "DEPENDENCY_UNAVAILABLE",
        "Phone verification is waiting for the Twilio Verify service.",
      );
    }
    const sent = await provider.send(e164);
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await startPhoneChallengeCommand(
        context,
        await sha256Hex(phoneHashInput(e164)),
        sent.codeHash,
        sent.provider,
        sent.sid,
      ),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
