import { resolveRequestContext } from "@/server/context";
import { assertBodySize, assertJsonContentType, rejectUnknownKeys } from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { bookmarkScholarshipCommand } from "@/server/modules/scholarships/commands";

const ALLOWED_KEYS = ["scholarshipId"] as const;

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId } = await params;
    requireUuid(caseId, "caseId");
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const scholarshipId = requireUuid(String(body.scholarshipId ?? ""), "scholarshipId");
    const context = await resolveRequestContext(requestId);
    const result = await bookmarkScholarshipCommand(context, caseId, scholarshipId);
    return commandSuccess(result, requestId, { status: result.created ? 201 : 200 });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
