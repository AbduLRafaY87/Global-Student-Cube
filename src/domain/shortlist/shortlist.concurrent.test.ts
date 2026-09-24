import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Pool } from "pg";

const DATABASE_URL = process.env.COMMANDS_DATABASE_URL ?? process.env.SUPABASE_DB_URL;

describe("concurrent saved-pair cap", () => {
  it("two concurrent saves cannot exceed three", async (t) => {
    if (!DATABASE_URL) {
      t.skip("No linked database URL. Concurrent cap evidence stays unverified.");
      return;
    }

    const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
    const student = "cccc0001-0001-4000-8000-0000000000a1";
    const caseId = "cccc0001-0001-4000-8000-0000000000c1";
    const claims = JSON.stringify({
      sub: student,
      role: "authenticated",
      requestId: "req_shortlist_race",
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
            'shortlist-race@example.invalid', crypt('test-password', gen_salt('bf')),
            now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
            now(), now(), '', '', '', ''
          ) ON CONFLICT (id) DO NOTHING`,
          [student],
        );
        await setup.query(
          `INSERT INTO public.accounts (id, auth_user_id, email_normalized, status, gsc_id)
           VALUES ($1, $1, 'shortlist-race@example.invalid', 'approved', 'GSC-RACE')
           ON CONFLICT (id) DO NOTHING`,
          [student],
        );
        await setup.query(
          `INSERT INTO public.cases (
            id, student_account_id, student_name, student_dob, state, module3_completed_at
          ) VALUES ($1, $2, 'Race Case', '2000-01-01', 'active', now())
          ON CONFLICT (id) DO UPDATE SET module3_completed_at = now()`,
          [caseId, student],
        );
        await setup.query(
          `INSERT INTO public.consent_events (
            subject_id, case_id, actor_id, purpose, policy_version, decision, evidence_hash, occurred_at
          ) VALUES ($1, $2, $1, 'data_use', 'gsc-data-use-2026-09-19', true, 'hash-race', now())
          ON CONFLICT DO NOTHING`,
          [student, caseId],
        );
        for (let index = 1; index <= 4; index += 1) {
          const universityId = `cccc1000-0001-4000-8000-00000000000${index}`;
          const programId = `cccc2000-0001-4000-8000-00000000000${index}`;
          await setup.query(
            `INSERT INTO public.universities (
              id, name, country, city, type, website_url, publication_state
            ) VALUES ($1, $2, 'GB', 'London', 'public', $3, 'published')
            ON CONFLICT (id) DO NOTHING`,
            [
              universityId,
              `SYNTHETIC - not real Race University ${index}`,
              `https://example.invalid/race-${index}`,
            ],
          );
          await setup.query(
            `INSERT INTO public.programs (
              id, university_id, name, level, field_id, duration_value, duration_unit,
              study_modes, general_url, publication_state
            ) VALUES (
              $1, $2, $3, 'undergraduate', '20000000-0000-4000-8000-000000000001',
              3, 'years', ARRAY['on_campus']::text[], $4, 'published'
            ) ON CONFLICT (id) DO NOTHING`,
            [
              programId,
              universityId,
              `SYNTHETIC - not real Race Program ${index}`,
              `https://example.invalid/race-program-${index}`,
            ],
          );
        }
        await setup.query("DELETE FROM public.saved_program_pairs WHERE case_id = $1", [caseId]);
        await setup.query("SELECT set_config('request.jwt.claims', $1, true)", [claims]);
        await setup.query(
          `SELECT commands.save_program_pair($1, $2, $3)`,
          [caseId, "cccc1000-0001-4000-8000-000000000001", "cccc2000-0001-4000-8000-000000000001"],
        );
        await setup.query(
          `SELECT commands.save_program_pair($1, $2, $3)`,
          [caseId, "cccc1000-0001-4000-8000-000000000002", "cccc2000-0001-4000-8000-000000000002"],
        );
        await setup.query("COMMIT");
      } catch (error) {
        await setup.query("ROLLBACK");
        throw error;
      } finally {
        setup.release();
      }

      const results = await Promise.allSettled([
        raceSave(pool, claims, caseId, "cccc1000-0001-4000-8000-000000000003", "cccc2000-0001-4000-8000-000000000003"),
        raceSave(pool, claims, caseId, "cccc1000-0001-4000-8000-000000000004", "cccc2000-0001-4000-8000-000000000004"),
      ]);
      const count = await pool.query(
        `SELECT count(*)::int AS n FROM public.saved_program_pairs WHERE case_id = $1`,
        [caseId],
      );
      const saved = Number(count.rows[0]?.n ?? 0);
      assert.ok(saved <= 3, `concurrent saves stored ${saved} pairs`);
      assert.ok(
        results.some((row) => row.status === "rejected"),
        "one of the racing saves must fail once the third slot is taken",
      );
    } finally {
      await pool.end();
    }
  });
});

async function raceSave(
  pool: Pool,
  claims: string,
  caseId: string,
  universityId: string,
  programId: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [claims]);
    await client.query(`SELECT commands.save_program_pair($1, $2, $3)`, [
      caseId,
      universityId,
      programId,
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
