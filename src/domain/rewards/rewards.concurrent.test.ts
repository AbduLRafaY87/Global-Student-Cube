import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Pool } from "pg";
import { applyConcurrentReserves } from "./ledger";
import { RECOGNITION_PACK_COST } from "./redemptions";

const DATABASE_URL = process.env.COMMANDS_DATABASE_URL ?? process.env.SUPABASE_DB_URL;

describe("concurrent redemption cannot overspend", () => {
  it("domain race keeps spendable non-negative", () => {
    assert.deepEqual(applyConcurrentReserves(500, [500, 500]), [500]);
  });

  it("two reserved redemptions cannot spend more than available", async (t) => {
    if (!DATABASE_URL) {
      t.skip("No linked database URL. Concurrent redemption evidence stays unverified.");
      return;
    }

    const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
    const mentor = "dddd0001-0001-4000-8000-0000000000a1";
    const claims = JSON.stringify({
      sub: mentor,
      role: "authenticated",
      requestId: "req_reward_race",
    });

    try {
      const setup = await pool.connect();
      try {
        await setup.query("BEGIN");
        await setup.query(
          `INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, email_change,
            email_change_token_new, recovery_token
          ) VALUES (
            '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
            'reward-race@example.invalid', crypt('test-password', gen_salt('bf')),
            now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
            now(), now(), '', '', '', ''
          ) ON CONFLICT (id) DO NOTHING`,
          [mentor],
        );
        await setup.query(
          `INSERT INTO public.accounts (id, auth_user_id, email_normalized, status, gsc_id)
           VALUES ($1, $1, 'reward-race@example.invalid', 'approved', 'GSC-REW')
           ON CONFLICT (id) DO NOTHING`,
          [mentor],
        );
        await setup.query(
          `INSERT INTO public.mentor_profiles (
            account_id, study_status, verification_state, published
          ) VALUES ($1, 'graduated', 'approved', true)
           ON CONFLICT (account_id) DO UPDATE SET verification_state = 'approved'`,
          [mentor],
        );
        await setup.query(`SELECT commands.ensure_reward_account($1)`, [mentor]);
        await setup.query(
          `UPDATE public.reward_accounts SET last_fresh_auth_at = now() WHERE account_id = $1`,
          [mentor],
        );
        await setup.query(`DELETE FROM public.redemptions WHERE account_id = $1`, [mentor]);
        await setup.query(`DELETE FROM public.points_entries WHERE account_id = $1`, [mentor]);
        for (let index = 1; index <= 20; index += 1) {
          const sourceId = `dddd1000-0001-4000-8000-0000000000${String(index).padStart(2, "0")}`;
          await setup.query(
            `INSERT INTO public.points_entries (
              account_id, event_type, points, source_id, idempotency_key
            ) VALUES ($1, 'earn_mentoring', 25, $2, $3)`,
            [mentor, sourceId, `earn_mentoring:${sourceId}`],
          );
        }
        await setup.query("COMMIT");
      } catch (error) {
        await setup.query("ROLLBACK");
        throw error;
      } finally {
        setup.release();
      }

      await Promise.allSettled([
        raceRedeem(pool, claims),
        raceRedeem(pool, claims),
      ]);
      const reserved = await pool.query<{ points: string }>(
        `SELECT COALESCE(sum(points), 0)::text AS points
         FROM public.points_entries
         WHERE account_id = $1 AND event_type = 'reserve'`,
        [mentor],
      );
      assert.ok(
        Number(reserved.rows[0]?.points ?? 0) <= RECOGNITION_PACK_COST,
        "concurrent reservations overspent the ledger",
      );
    } finally {
      await pool.end();
    }
  });
});

async function raceRedeem(pool: Pool, claims: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [claims]);
    await client.query(`SELECT commands.create_redemption($1, $2)`, [
      "recognition-pack-500",
      false,
    ]);
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The command may already have aborted the transaction.
    }
    throw error;
  } finally {
    client.release();
  }
}
