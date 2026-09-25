import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.COMMANDS_DATABASE_URL,
  max: 2,
});

async function main(): Promise<void> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ worker_expire_mentor_requests: number }>(
      "SELECT commands.worker_expire_mentor_requests() AS worker_expire_mentor_requests",
    );
    const updated = result.rows[0]?.worker_expire_mentor_requests ?? 0;
    process.stdout.write(
      `${JSON.stringify({ event: "mentor_request_expire", updated })}\n`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
