import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.COMMANDS_DATABASE_URL,
  max: 2,
});

async function main(): Promise<void> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ worker_tick_session_no_shows: number }>(
      "SELECT commands.worker_tick_session_no_shows() AS worker_tick_session_no_shows",
    );
    const updated = result.rows[0]?.worker_tick_session_no_shows ?? 0;
    process.stdout.write(
      `${JSON.stringify({ event: "session_no_show_tick", updated })}\n`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
