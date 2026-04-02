import { NextResponse } from "next/server";
import { incrementAccess, incrementCompletion, addRating } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  let body: { type?: string; stars?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (body.type) {
      case "accessed":
        await incrementAccess(gameId);
        break;

      case "completed":
        await incrementCompletion(gameId);
        break;

      case "rating": {
        const stars = body.stars;
        if (
          typeof stars !== "number" ||
          !Number.isInteger(stars) ||
          stars < 1 ||
          stars > 5
        ) {
          return NextResponse.json(
            { error: "stars must be an integer between 1 and 5" },
            { status: 400 }
          );
        }
        await addRating(gameId, stars);
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid event type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to record event:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
