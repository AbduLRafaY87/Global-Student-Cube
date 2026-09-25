import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Pool } from "pg";
import {
  AUTHENTICATED_WRITE_GRANT_ALLOWLIST,
  unexpectedAuthenticatedWriteGrants,
  type TableWriteGrant,
} from "./grants";

const DATABASE_URL = process.env.SUPABASE_DB_URL ?? process.env.COMMANDS_DATABASE_URL;

describe("authenticated write grants", () => {
  it("keeps the allowlist empty so leftover tables cannot take writes", () => {
    assert.deepEqual([...AUTHENTICATED_WRITE_GRANT_ALLOWLIST], []);
    assert.deepEqual(
      unexpectedAuthenticatedWriteGrants([
        { table: "essays", privilege: "INSERT" },
      ]),
      [{ table: "essays", privilege: "INSERT" }],
    );
  });

  it("fails when authenticated still holds INSERT/UPDATE/DELETE off the allowlist", async (t) => {
    if (!DATABASE_URL) {
      t.skip("No linked database URL. Grant evidence stays unverified.");
      return;
    }

    const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
    try {
      const result = await pool.query<{
        table_name: string;
        privilege_type: "INSERT" | "UPDATE" | "DELETE";
      }>(
        `SELECT table_name, privilege_type
         FROM information_schema.role_table_grants
         WHERE grantee = 'authenticated'
           AND table_schema = 'public'
           AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
         ORDER BY table_name, privilege_type`,
      );
      const grants: TableWriteGrant[] = result.rows.map((row) => ({
        table: row.table_name,
        privilege: row.privilege_type,
      }));
      assert.deepEqual(unexpectedAuthenticatedWriteGrants(grants), []);
    } finally {
      await pool.end();
    }
  });
});
