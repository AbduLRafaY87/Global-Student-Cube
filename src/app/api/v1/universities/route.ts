import { catalogPage } from "@/domain/catalog/catalog";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { fetchPublishedUniversities } from "@/server/modules/catalog/public";

export async function GET(request: Request) {
  const requestId = newRequestId();
  try {
    const url = new URL(request.url);
    const page = catalogPage(
      Number(url.searchParams.get("limit") ?? "20") || 20,
      Number(url.searchParams.get("offset") ?? "0") || 0,
    );
    const rows = await fetchPublishedUniversities();
    const slice = rows.slice(page.offset, page.offset + page.limit);
    return commandSuccess(
      {
        items: slice,
        hasMore: page.offset + page.limit < rows.length,
        nextCursor: page.offset + page.limit < rows.length ? String(page.offset + page.limit) : null,
      },
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
