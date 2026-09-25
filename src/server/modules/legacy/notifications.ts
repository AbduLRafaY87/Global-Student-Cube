import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

interface PayloadRow<T> {
  payload: T;
}

export async function markNotificationsReadCommand(
  context: RequestContext,
  id: string | null,
) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.mark_notifications_read($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}

export async function clearNotificationsCommand(
  context: RequestContext,
  id: string | null,
) {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.clear_notifications($1::uuid) AS payload`,
    [id],
  );
  return row.payload;
}
