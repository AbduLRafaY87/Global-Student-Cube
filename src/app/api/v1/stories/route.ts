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
import { optionalUuid } from "@/server/modules/admin/http";
import { submitStorySql } from "@/server/modules/news/commands";

const ALLOWED_KEYS = [
  "id",
  "title",
  "body",
  "country",
  "topic",
  "publicationConsent",
  "nameConsent",
  "imageConsent",
  "spotlightConsent",
  "mentorNamed",
  "mentorConsent",
  "parentNamed",
  "parentConsent",
  "submit",
] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.title !== "string" || typeof body.body !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await submitStorySql(context, {
        id: optionalUuid(typeof body.id === "string" ? body.id : null),
        title: body.title,
        body: body.body,
        country: typeof body.country === "string" ? body.country : "",
        topic: typeof body.topic === "string" ? body.topic : "alumni_success",
        publicationConsent: body.publicationConsent === true,
        nameConsent: body.nameConsent === true,
        imageConsent: body.imageConsent === true,
        spotlightConsent: body.spotlightConsent === true,
        mentorNamed: body.mentorNamed === true,
        mentorConsent: body.mentorConsent === true,
        parentNamed: body.parentNamed === true,
        parentConsent: body.parentConsent === true,
        submit: body.submit === true,
      }),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
