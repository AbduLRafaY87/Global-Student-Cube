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
import { createParentInvitationSql } from "@/server/modules/identity/invitations";
import { randomBytes } from "node:crypto";

const ALLOWED_KEYS = ["email", "scopes"] as const;

interface CreateParentLinkBody {
  email?: unknown;
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

    if (typeof body.email !== "string" || validateLoginEmail(body.email)) {
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
    const email = normalizeEmail(body.email);
    const token = randomBytes(32).toString("base64url");
    const [emailHash, tokenHash] = await Promise.all([
      sha256Hex(email),
      sha256Hex(token),
    ]);

    const created = await createParentInvitationSql(context, {
      caseId,
      emailHash,
      tokenHash,
      scopes,
    });

    const origin = new URL(request.url).origin;
    try {
      await sendInvitationEmail({
        to: email,
        acceptUrl: `${origin}/invite/accept?token=${encodeURIComponent(token)}&kind=parent`,
        role: "parent",
      });
    } catch {
      // Outbox row remains.
    }

    return commandSuccess(created, requestId, { status: 201 });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
