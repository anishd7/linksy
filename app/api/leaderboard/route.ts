import { NextResponse } from "next/server";
import { getTopGames, populateLeaderboard } from "@/lib/leaderboard";

const VALID_K = new Set([1, 3, 5, 10]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kParam = searchParams.get("k");
  const k = kParam ? parseInt(kParam, 10) : 5;

  if (!VALID_K.has(k)) {
    return NextResponse.json(
      { error: "k must be one of: 1, 3, 5, 10" },
      { status: 400 }
    );
  }

  try {
    let results = await getTopGames(k);

    if (results.length === 0) {
      await populateLeaderboard();
      results = await getTopGames(k);
    }

    const leaderboard = results.map((entry, index) => ({
      rank: index + 1,
      gameId: entry.gameId,
      score: entry.score,
      ratingCount: entry.ratingCount,
    }));

    return NextResponse.json(leaderboard, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
