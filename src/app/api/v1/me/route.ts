import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { parseIfMatchVersion } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { updateUserProfile } from "@/server/modules/identity/update-user-profile";

const ALLOWED_KEYS = [
  "firstName",
  "lastName",
  "phone",
  "onboardingCompleted",
] as const;

interface PatchMeBody {
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  onboardingCompleted?: unknown;
}

export async function PATCH(request: Request) {
  const requestId = newRequestId();

  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as PatchMeBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    if (
      typeof body.firstName !== "string" ||
      typeof body.lastName !== "string"
    ) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const phone =
      body.phone === undefined || body.phone === null
        ? null
        : typeof body.phone === "string"
          ? body.phone
          : null;

    if (body.phone !== undefined && body.phone !== null && typeof body.phone !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const context = await resolveRequestContext(requestId);
    const expectedVersion = parseIfMatchVersion(request.headers.get("if-match"));
    const result = await updateUserProfile(context, {
      expectedVersion,
      firstName: body.firstName,
      lastName: body.lastName,
      phone,
      onboardingCompleted:
        typeof body.onboardingCompleted === "boolean"
          ? body.onboardingCompleted
          : false,
    });

    return commandSuccess(result, requestId, { version: result.version });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
