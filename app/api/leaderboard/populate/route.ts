import { NextResponse } from "next/server";
import { populateLeaderboard } from "@/lib/leaderboard";

export async function POST() {
  try {
    const count = await populateLeaderboard();
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    console.error("Failed to populate leaderboard:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
