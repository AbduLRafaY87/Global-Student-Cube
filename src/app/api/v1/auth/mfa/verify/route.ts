import { normalizeEmail } from "@/domain/identity/email";
import { sha256Hex } from "@/domain/identity/hash";
import { generateRecoveryCodes, normalizeRecoveryCode } from "@/domain/identity/recovery";
import { createClient } from "@/lib/supabase/server";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import {
  consumeMfaRecoveryCodeSql,
  replaceMfaRecoveryCodesSql,
} from "@/server/modules/identity/invitations";
import { randomBytes } from "node:crypto";

const ALLOWED_KEYS = [
  "factorId",
  "challengeId",
  "code",
  "recoveryCode",
  "purpose",
] as const;

interface VerifyBody {
  factorId?: unknown;
  challengeId?: unknown;
  code?: unknown;
  recoveryCode?: unknown;
  purpose?: unknown;
}

export async function POST(request: Request) {
  const requestId = newRequestId();

  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as VerifyBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      throw new CommandError("AUTH_REQUIRED", "Sign in to continue.");
    }

    const context = await resolveRequestContext(requestId);

    if (typeof body.recoveryCode === "string" && body.recoveryCode.trim()) {
      const hash = await sha256Hex(normalizeRecoveryCode(body.recoveryCode));
      const consumed = await consumeMfaRecoveryCodeSql(context, hash);
      if (!consumed) {
        throw new CommandError(
          "VALIDATION_FAILED",
          "That recovery code is not valid.",
        );
      }
      return commandSuccess({ mode: "recovery", reenroll: true }, requestId);
    }

    if (
      typeof body.factorId !== "string" ||
      typeof body.challengeId !== "string" ||
      typeof body.code !== "string"
    ) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const { error } = await supabase.auth.mfa.verify({
      factorId: body.factorId,
      challengeId: body.challengeId,
      code: body.code,
    });

    if (error) {
      throw new CommandError(
        "VALIDATION_FAILED",
        "That authenticator code is not valid.",
      );
    }

    if (body.purpose !== "enroll") {
      return commandSuccess({ mode: "totp", recoveryCodes: [] }, requestId);
    }

    const codes = generateRecoveryCodes((size) => randomBytes(size));
    const hashes = await Promise.all(
      codes.map((code) => sha256Hex(normalizeRecoveryCode(code))),
    );
    await replaceMfaRecoveryCodesSql(
      context,
      hashes,
      normalizeEmail(user.email),
    );

    return commandSuccess(
      { mode: "totp", recoveryCodes: codes },
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
