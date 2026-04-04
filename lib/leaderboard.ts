import {
  sortedSetAdd,
  sortedSetRemove,
  sortedSetTopK,
  keyExists,
  setKeyExpiry,
  hashSet,
  hashGetMultiple,
  hashDel,
} from "./redis";
import { getAllRatedGames } from "./db";

const LEADERBOARD_KEY = "leaderboard:games";
const LEADERBOARD_COUNTS_KEY = "leaderboard:counts";
const CACHE_TTL_SECONDS = 86400; // 24 hours

export async function updateLeaderboardScore(
  gameId: string,
  ratingSum: number,
  ratingCount: number
): Promise<void> {
  const exists = await keyExists(LEADERBOARD_KEY);
  if (!exists) return;

  if (ratingCount === 0) {
    await sortedSetRemove(LEADERBOARD_KEY, gameId);
    await hashDel(LEADERBOARD_COUNTS_KEY, gameId);
  } else {
    const score = ratingSum / ratingCount;
    await sortedSetAdd(LEADERBOARD_KEY, score, gameId);
    await hashSet(LEADERBOARD_COUNTS_KEY, gameId, String(ratingCount));
  }
}

export async function getTopGames(
  k: number
): Promise<{ gameId: string; score: number; ratingCount: number }[]> {
  const entries = await sortedSetTopK(LEADERBOARD_KEY, k);
  if (entries.length === 0) return [];

  const gameIds = entries.map((e) => e.member);
  const counts = await hashGetMultiple(LEADERBOARD_COUNTS_KEY, gameIds);

  return entries.map((e, i) => ({
    gameId: e.member,
    score: e.score,
    ratingCount: Number(counts[i] ?? 0),
  }));
}

export async function populateLeaderboard(): Promise<number> {
  const games = await getAllRatedGames();

  for (const game of games) {
    const score = game.ratingSum / game.ratingCount;
    await sortedSetAdd(LEADERBOARD_KEY, score, game.gameId);
    await hashSet(LEADERBOARD_COUNTS_KEY, game.gameId, String(game.ratingCount));
  }

  if (games.length > 0) {
    await setKeyExpiry(LEADERBOARD_KEY, CACHE_TTL_SECONDS);
    await setKeyExpiry(LEADERBOARD_COUNTS_KEY, CACHE_TTL_SECONDS);
  }

  return games.length;
}
