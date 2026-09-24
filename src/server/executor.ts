import { Pool, type PoolClient } from "pg";
import { CommandError, mapExecutorError } from "@/server/errors";
import type { GuestContext, RequestContext } from "@/server/context";

type ExecutorContext = RequestContext | GuestContext;

const POOL_MAX = 4;
const CONNECT_TIMEOUT_MS = 5_000;
const IDLE_TIMEOUT_MS = 10_000;
const STATEMENT_TIMEOUT = "8s";

let pool: Pool | undefined;

function commandPool(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.COMMANDS_DATABASE_URL;
  if (!connectionString) {
    throw new CommandError(
      "INTERNAL_ERROR",
      "Command executor is not configured.",
    );
  }

  pool = new Pool({
    connectionString,
    max: POOL_MAX,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    allowExitOnIdle: true,
  });

  return pool;
}

function claimsJson(context: ExecutorContext): string {
  return JSON.stringify({
    sub: context.accountId,
    role: context.accountId ? "authenticated" : "anon",
    sessionId: context.sessionId,
    assurance: context.assurance,
    requestId: context.requestId,
  });
}

export async function withCommandClient<T>(
  context: ExecutorContext,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  let client: PoolClient | undefined;
  try {
    client = await commandPool().connect();
    await client.query("BEGIN");
    await client.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT}'`);
    await client.query("SELECT set_config($1, $2, true)", [
      "request.jwt.claims",
      claimsJson(context),
    ]);
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // The connection may already be dead after a timeout or drop.
      }
    }
    throw mapExecutorError(error);
  } finally {
    client?.release();
  }
}

export async function queryCommand<T>(
  context: ExecutorContext,
  sql: string,
  values: unknown[] = [],
): Promise<T> {
  return withCommandClient(context, async (client) => {
    const result = await client.query(sql, values);
    if (result.rows.length === 0) {
      throw new CommandError("INTERNAL_ERROR", "Command returned no result.");
    }
    return result.rows[0] as T;
  });
}
