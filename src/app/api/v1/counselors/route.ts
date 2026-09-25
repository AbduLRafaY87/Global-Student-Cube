import { newRequestId } from "@/server/http/envelope";
import { commandSuccess } from "@/server/http/respond";

export async function GET() {
  const requestId = newRequestId();
  return commandSuccess(
    {
      items: [],
      hasMore: false,
      nextCursor: null,
      emptyReason: "Counselor matching (SES-01) is not built.",
    },
    requestId,
  );
}
