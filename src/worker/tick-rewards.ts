import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.COMMANDS_DATABASE_URL,
  max: 2,
});

async function main(): Promise<void> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ worker_tick_rewards: Record<string, unknown> }>(
      "SELECT commands.worker_tick_rewards() AS worker_tick_rewards",
    );
    process.stdout.write(
      `${JSON.stringify({ event: "rewards_tick", result: result.rows[0]?.worker_tick_rewards ?? {} })}\n`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
