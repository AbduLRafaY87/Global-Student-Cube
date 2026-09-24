import { sha256Hex } from "@/domain/identity/hash";
import { isInvitableRole, inviteExpiry } from "@/domain/identity/invitations";
import { normalizeEmail, validateLoginEmail } from "@/domain/identity/email";
import { sendInvitationEmail } from "@/lib/email/outbox-resend";
import { createClient } from "@/lib/supabase/server";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { createInvitationSql } from "@/server/modules/identity/invitations";
import { randomBytes } from "node:crypto";

const ALLOWED_KEYS = ["email", "role", "scopes"] as const;

interface CreateInvitationBody {
  email?: unknown;
  role?: unknown;
  scopes?: unknown;
}

export async function POST(request: Request) {
  const requestId = newRequestId();

  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as CreateInvitationBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    if (typeof body.email !== "string" || typeof body.role !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const emailError = validateLoginEmail(body.email);
    if (emailError || !isInvitableRole(body.role)) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const scopes = Array.isArray(body.scopes)
      ? body.scopes.filter((value): value is string => typeof value === "string")
      : [];

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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const inviterEmail = user?.email ? normalizeEmail(user.email) : "";
    if (!inviterEmail) {
      throw new CommandError("AUTH_REQUIRED", "Sign in to continue.");
    }

    const email = normalizeEmail(body.email);
    const token = randomBytes(32).toString("base64url");
    const [emailHash, tokenHash] = await Promise.all([
      sha256Hex(email),
      sha256Hex(token),
    ]);

    const created = await createInvitationSql(context, {
      emailHash,
      tokenHash,
      role: body.role,
      scopes,
      expiresAt: inviteExpiry().toISOString(),
      inviterEmailNormalized: inviterEmail,
    });

    const origin = new URL(request.url).origin;
    const acceptUrl = `${origin}/invite/accept?token=${encodeURIComponent(token)}`;

    try {
      await sendInvitationEmail({
        to: email,
        acceptUrl,
        role: body.role,
      });
    } catch {
      // Invite row and outbox remain; delivery can retry from the outbox later.
    }

    return commandSuccess(
      { id: created.id, role: created.role, expiresAt: created.expiresAt },
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
