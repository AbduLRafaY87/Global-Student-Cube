import { isGiftCardFulfillmentEnabled, rejectClientSubmittedTotals } from "@/domain/rewards/ledger";
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
import { createRedemptionSql } from "@/server/modules/rewards/commands";

const ALLOWED_KEYS = ["catalogCode"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    if (rejectClientSubmittedTotals(body)) {
      throw new CommandError("VALIDATION_FAILED", "Point totals cannot be submitted by the client.");
    }
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.catalogCode !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await createRedemptionSql(
        context,
        body.catalogCode,
        isGiftCardFulfillmentEnabled(process.env.GSC_FEATURE_GIFT_CARDS),
      ),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
