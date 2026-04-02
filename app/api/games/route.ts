import { NextResponse } from "next/server";
import { generateGameId } from "@/lib/id";
import { insertGame } from "@/lib/db";
import { validateGameData } from "@/lib/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = validateGameData(body);
  if (!result.valid) {
    return NextResponse.json(
      { error: "Validation failed", details: result.errors },
      { status: 400 }
    );
  }

  const { gameData } = result;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const gameId = generateGameId();
    try {
      await insertGame(gameId, gameData);

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:3000`;
      return NextResponse.json(
        {
          gameId,
          url: `${baseUrl}/game/${gameId}`,
        },
        { status: 201 }
      );
    } catch (err: unknown) {
      // Check for unique constraint violation (Postgres error code 23505)
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505" && attempt < maxRetries - 1) {
        continue;
      }
      console.error("Failed to create game:", err);
      return NextResponse.json(
        { error: "Failed to create game" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Failed to create game after retries" },
    { status: 500 }
  );
}
