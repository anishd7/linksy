"use client";

import { useEffect, useState, use } from "react";
import { Header } from "@/components/Header";
import { GameBoard } from "@/components/GameBoard";
import { GameNotFound } from "@/components/GameNotFound";
import { Skeleton } from "@/components/ui/skeleton";
import { getGame, sendEvent, NotFoundError } from "@/lib/api";
import { track } from "@vercel/analytics";
import type { GetGameResponse } from "@/lib/api";
import Link from "next/link";

export default function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const [game, setGame] = useState<GetGameResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getGame(gameId)
      .then((data) => {
        if (cancelled) return;
        setGame(data);
        setLoading(false);
        // Fire-and-forget access event
        sendEvent(gameId, { type: "accessed" });
        track("game_played");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof NotFoundError) {
          setNotFound(true);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  return (
    <div className="flex flex-col items-center min-h-full px-4 pb-12">
      <div className="w-full max-w-lg flex items-center justify-between py-4">
        <Header size="small" />
        <Link
          href="/"
          className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A] underline underline-offset-4"
        >
          Create your own
        </Link>
      </div>

      <main className="w-full max-w-lg">
        {loading && <LoadingSkeleton />}
        {notFound && <GameNotFound />}
        {game && <GameBoard gameId={gameId} gameData={game.gameData} />}
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 16 }).map((_, i) => (
        <Skeleton key={i} className="h-[56px] rounded-lg" />
      ))}
    </div>
  );
}
