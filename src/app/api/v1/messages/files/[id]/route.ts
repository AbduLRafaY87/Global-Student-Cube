import { SIGNED_DOWNLOAD_SECONDS } from "@/domain/profile/files";
import { createClient } from "@/lib/supabase/server";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { issueConversationFileDownloadSql } from "@/server/modules/messaging/commands";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { id } = await params;
    requireUuid(id, "id");
    const context = await resolveRequestContext(requestId);
    const issued = await issueConversationFileDownloadSql(context, id);
    const objectKey = typeof issued.objectKey === "string" ? issued.objectKey : "";
    const bucket = typeof issued.bucket === "string" ? issued.bucket : "student-documents";
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectKey, SIGNED_DOWNLOAD_SECONDS);
    if (error || !data?.signedUrl) {
      throw new CommandError("DEPENDENCY_UNAVAILABLE", "A required service is unavailable.");
    }
    return commandSuccess(
      { id, url: data.signedUrl, expiresIn: SIGNED_DOWNLOAD_SECONDS },
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
