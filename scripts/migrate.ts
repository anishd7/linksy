import { Pool } from "pg";

async function migrate() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error("POSTGRES_URL environment variable is required");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log("Running migration...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        game_id        VARCHAR(8) PRIMARY KEY,
        game_data      JSONB NOT NULL,
        access_count   INTEGER NOT NULL DEFAULT 0,
        completion_count INTEGER NOT NULL DEFAULT 0,
        rating_sum     INTEGER NOT NULL DEFAULT 0,
        rating_count   INTEGER NOT NULL DEFAULT 0,
        created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    console.log("Migration complete: games table ready.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
