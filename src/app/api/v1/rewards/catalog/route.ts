import { isGiftCardFulfillmentEnabled } from "@/domain/rewards/ledger";
import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { listRewardCatalogSql } from "@/server/modules/rewards/commands";

export async function GET() {
  const requestId = newRequestId();
  try {
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await listRewardCatalogSql(
        context,
        isGiftCardFulfillmentEnabled(process.env.GSC_FEATURE_GIFT_CARDS),
      ),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
