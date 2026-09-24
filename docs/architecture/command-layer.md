# Command layer

Sensitive writes go through `commands.*` PostgreSQL functions. The browser never mutates private tables. The Next.js server verifies the cookie session, then calls those functions as `gsc_api_executor`.

`commands` is not in `[api].schemas`. Do not add it to the Data API.

## Serverless connection constraint (Vercel)

`src/server/executor.ts` runs in Vercel serverless functions, not a long-lived process.

- Reuse **one module-level `pg` Pool** on a warm instance. Do not `new Pool()` per request.
- Checkout **one client per command**. Release it in a `finally` block on success, error, and mid-transaction failure.
- Keep `max` in the single digits (currently 4), set `connectionTimeoutMillis` (5s), and `SET LOCAL statement_timeout` so a pooler outage fails fast as `500 INTERNAL_ERROR` instead of hanging the function.
- A function timeout can still drop a client before `finally` runs; the short statement timeout is the backstop.

`COMMANDS_DATABASE_URL` is the `gsc_api_executor` connection string. It is server-only. Never prefix it with `NEXT_PUBLIC_`.

Windows unit tests use `scripts/run-unit-tests.mjs`, not shell globs, because `node --test` hangs silently on unmatched globs on Windows/Node 24.

Owner setup on the linked project (password is not in a migration):

```sql
ALTER ROLE gsc_api_executor LOGIN PASSWORD '...';
```

Then set `COMMANDS_DATABASE_URL` to that role’s URI (direct or transaction pooler). Session settings used here (`set_config`, `SET LOCAL`) stay on the checked-out client for that one transaction.

## How to add a new command

1. New migration: `CREATE FUNCTION commands.do_thing(...)` `SECURITY DEFINER`, read actor from `commands.actor_id()`, lock the row, check `version`, write the change, insert `audit_events` and `outbox_events` in the same function. `REVOKE` browser mutations on any new private table. `GRANT EXECUTE` only to `gsc_api_executor`.
2. `src/server/modules/<domain>/…ts`: call `queryCommand(context, 'SELECT commands.do_thing($1, …) AS payload', […])`.
3. Route or server action: `resolveRequestContext()` → module → `commandSuccess` / form error. Creates send `Idempotency-Key`. Updates send `If-Match: "vN"`.
4. pgTAP: authenticated `INSERT`/`UPDATE`/`DELETE` denied; executor path writes audit + outbox; a forced `RAISE` after those inserts leaves nothing.

Do not call `.from('<table>').insert/update/delete` from the browser client or from a server action.

## Leftover gap

`student_profiles` is still writable through the Data API until Prompt 12 (STU-02). Do not extend that table here.
