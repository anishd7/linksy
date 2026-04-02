import type { GameData } from "./db";

const BASE = "";

export interface CreateGameResponse {
  gameId: string;
  url: string;
}

export interface GetGameResponse {
  gameId: string;
  gameData: GameData;
  createdAt: string;
}

export async function createGame(
  gameData: GameData
): Promise<CreateGameResponse> {
  const res = await fetch(`${BASE}/api/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(gameData),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to create game (${res.status})`);
  }
  return res.json();
}

export async function getGame(gameId: string): Promise<GetGameResponse> {
  const res = await fetch(`${BASE}/api/games/${gameId}`);
  if (res.status === 404) {
    throw new NotFoundError();
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch game (${res.status})`);
  }
  return res.json();
}

export function sendEvent(
  gameId: string,
  event: { type: "accessed" } | { type: "completed" } | { type: "rating"; stars: number }
): void {
  // Fire-and-forget: no await, silently swallow errors
  fetch(`${BASE}/api/games/${gameId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch(() => {});
}

export class NotFoundError extends Error {
  constructor() {
    super("Game not found");
    this.name = "NotFoundError";
  }
}
