"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface LeaderboardEntry {
  rank: number;
  gameId: string;
  score: number;
}

const K_OPTIONS = [1, 3, 5, 10] as const;

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#F9DF6D] text-[#1A1A1A] font-bold text-sm">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#C0C0C0] text-[#1A1A1A] font-bold text-sm">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#CD7F32] text-white font-bold text-sm">
        3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-[#1A1A1A] font-bold text-sm">
      {rank}
    </span>
  );
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [k, setK] = useState<number>(5);

  const fetchLeaderboard = useCallback(async (topK: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?k=${topK}`);
      if (res.ok) {
        const data: LeaderboardEntry[] = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(k);
  }, [k, fetchLeaderboard]);

  return (
    <div className="flex flex-col items-center min-h-full px-4 pb-12">
      <Header size="small" />
      <main className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-2xl text-[#1A1A1A]">Leaderboard</h2>
          <label className="flex items-center gap-2 text-sm text-[#6B6B6B]">
            Top
            <select
              data-testid="k-select"
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#B0C4EF]"
            >
              {K_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: k }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center text-[#6B6B6B] py-12">
            No rated games yet.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.gameId}
                data-testid="leaderboard-entry"
                className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                <RankBadge rank={entry.rank} />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-sm text-[#6B6B6B]">
                    {entry.gameId}
                  </span>
                </div>
                <span className="text-sm font-medium text-[#1A1A1A] tabular-nums">
                  {entry.score.toFixed(1)} ★
                </span>
                <Link
                  href={`/game/${entry.gameId}`}
                  className="text-sm font-medium text-[#B0C4EF] hover:text-[#8AA4D4] transition-colors"
                >
                  Play →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
