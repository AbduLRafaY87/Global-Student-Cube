import { resolveRequestContext } from "@/server/context";
import { requireUuid } from "@/server/modules/admin/http";
import { getLearningResourceSql } from "@/server/modules/learning/commands";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  requireUuid(id, "id");
  const context = await resolveRequestContext();
  const resource = await getLearningResourceSql(context, id);
  const title = asString(resource.title) || "resource";
  const body = asString(resource.body);
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${title.replace(/[^a-zA-Z0-9._-]+/g, "-")}.txt"`,
    },
  });
}
