import { Pool } from "pg";

// Single pool instance reused across requests (serverless-safe: one pool per cold start)
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
  }
  return pool;
}

export interface GameRow {
  game_id: string;
  game_data: GameData;
  access_count: number;
  completion_count: number;
  rating_sum: number;
  rating_count: number;
  created_at: string;
}

export interface CategoryInfo {
  category: string;
  words: string[];
}

export interface GameData {
  yellow: CategoryInfo;
  green: CategoryInfo;
  blue: CategoryInfo;
  purple: CategoryInfo;
}

export async function insertGame(
  gameId: string,
  gameData: GameData
): Promise<void> {
  const db = getPool();
  await db.query(
    `INSERT INTO games (game_id, game_data) VALUES ($1, $2)`,
    [gameId, JSON.stringify(gameData)]
  );
}

export async function getGame(
  gameId: string
): Promise<GameRow | null> {
  const db = getPool();
  const result = await db.query<GameRow>(
    `SELECT game_id, game_data, created_at FROM games WHERE game_id = $1`,
    [gameId]
  );
  return result.rows[0] ?? null;
}

export async function incrementAccess(gameId: string): Promise<boolean> {
  const db = getPool();
  const result = await db.query(
    `UPDATE games SET access_count = access_count + 1 WHERE game_id = $1`,
    [gameId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function incrementCompletion(gameId: string): Promise<boolean> {
  const db = getPool();
  const result = await db.query(
    `UPDATE games SET completion_count = completion_count + 1 WHERE game_id = $1`,
    [gameId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function addRating(
  gameId: string,
  stars: number
): Promise<{ ratingSum: number; ratingCount: number } | null> {
  const db = getPool();
  const result = await db.query<{ rating_sum: number; rating_count: number }>(
    `UPDATE games SET rating_sum = rating_sum + $1, rating_count = rating_count + 1 WHERE game_id = $2 RETURNING rating_sum, rating_count`,
    [stars, gameId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { ratingSum: row.rating_sum, ratingCount: row.rating_count };
}

export async function getAllRatedGames(): Promise<
  { gameId: string; ratingSum: number; ratingCount: number }[]
> {
  const db = getPool();
  const result = await db.query<{
    game_id: string;
    rating_sum: number;
    rating_count: number;
  }>(`SELECT game_id, rating_sum, rating_count FROM games WHERE rating_count > 0`);
  return result.rows.map((row) => ({
    gameId: row.game_id,
    ratingSum: row.rating_sum,
    ratingCount: row.rating_count,
  }));
}
