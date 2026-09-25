import { isSixDigitOtp } from "@/domain/privacy/otp";
import { formatE164, validatePhoneParts } from "@/domain/identity/phone";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { phoneVerifyProvider } from "@/server/integrations/verify";
import {
  confirmTwilioPhoneCommand,
  recordPhoneChallengeFailureCommand,
} from "@/server/modules/privacy/commands";

const ALLOWED_KEYS = ["challengeId", "code", "countryCode", "national"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.code !== "string" || !isSixDigitOtp(body.code)) {
      throw new CommandError("VALIDATION_FAILED", "Enter the six-digit code.");
    }
    const country = typeof body.countryCode === "string" ? body.countryCode : "";
    const national = typeof body.national === "string" ? body.national : "";
    const invalid = validatePhoneParts(country, national, true);
    if (invalid) {
      throw new CommandError("VALIDATION_FAILED", invalid);
    }
    const provider = phoneVerifyProvider();
    const context = await resolveRequestContext(requestId);
    const challengeId = requireUuid(
      typeof body.challengeId === "string" ? body.challengeId : "",
      "challengeId",
    );
    const checked = await provider.check(formatE164(country, national), body.code, null);
    if (!checked.approved) {
      const failure = await recordPhoneChallengeFailureCommand(context, challengeId);
      throw new CommandError(
        failure.invalidated === true ? "RATE_LIMITED" : "VALIDATION_FAILED",
        failure.invalidated === true
          ? "Too many incorrect codes. Request a new code."
          : "That code is not valid.",
      );
    }
    return commandSuccess(
      await confirmTwilioPhoneCommand(context, challengeId),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
