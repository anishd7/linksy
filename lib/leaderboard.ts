import {
  sortedSetAdd,
  sortedSetRemove,
  sortedSetTopK,
  keyExists,
  setKeyExpiry,
} from "./redis";
import { getAllRatedGames } from "./db";

const LEADERBOARD_KEY = "leaderboard:games";
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
  } else {
    const score = ratingSum / ratingCount;
    await sortedSetAdd(LEADERBOARD_KEY, score, gameId);
  }
}

export async function getTopGames(
  k: number
): Promise<{ gameId: string; score: number }[]> {
  const entries = await sortedSetTopK(LEADERBOARD_KEY, k);
  return entries.map((e) => ({ gameId: e.member, score: e.score }));
}

export async function populateLeaderboard(): Promise<number> {
  const games = await getAllRatedGames();

  for (const game of games) {
    const score = game.ratingSum / game.ratingCount;
    await sortedSetAdd(LEADERBOARD_KEY, score, game.gameId);
  }

  if (games.length > 0) {
    await setKeyExpiry(LEADERBOARD_KEY, CACHE_TTL_SECONDS);
  }

  return games.length;
}
