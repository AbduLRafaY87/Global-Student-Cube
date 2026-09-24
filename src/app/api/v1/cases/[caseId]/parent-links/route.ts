import { normalizeEmail, validateLoginEmail } from "@/domain/identity/email";
import { sha256Hex } from "@/domain/identity/hash";
import { isParentScope } from "@/domain/identity/invitations";
import { sendInvitationEmail } from "@/lib/email/outbox-resend";
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
import { createParentInvitationByIdentifierCommand } from "@/server/modules/parent/commands";
import { randomBytes } from "node:crypto";

const ALLOWED_KEYS = ["email", "gscId", "identifier", "scopes"] as const;

interface CreateParentLinkBody {
  email?: unknown;
  gscId?: unknown;
  identifier?: unknown;
  scopes?: unknown;
}

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();

  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as CreateParentLinkBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    const identifier =
      typeof body.identifier === "string"
        ? body.identifier.trim()
        : typeof body.email === "string"
          ? body.email.trim()
          : typeof body.gscId === "string"
            ? body.gscId.trim()
            : "";
    if (!identifier) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    if (identifier.includes("@") && validateLoginEmail(identifier)) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const scopes = Array.isArray(body.scopes)
      ? body.scopes.filter(
          (value): value is string =>
            typeof value === "string" && isParentScope(value),
        )
      : [];

    const { caseId } = await params;
    const context = await resolveRequestContext(requestId);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = await sha256Hex(token);
    const created = await createParentInvitationByIdentifierCommand(context, {
      caseId,
      identifier: identifier.includes("@") ? normalizeEmail(identifier) : identifier,
      tokenHash,
      scopes,
    });

    const origin = new URL(request.url).origin;
    if (created.notifyEmail) {
      try {
        await sendInvitationEmail({
          to: created.notifyEmail,
          acceptUrl: `${origin}/invite/accept?token=${encodeURIComponent(token)}&kind=parent`,
          role: "parent",
        });
      } catch {
        // Outbox row remains. The client never learns whether an account existed.
      }
    }

    return commandSuccess(
      { id: created.id, caseId: created.caseId },
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
