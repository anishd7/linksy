"use client";

import { Header } from "@/components/Header";
import { CreateGameForm } from "@/components/CreateGameForm";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-full px-4 pb-12">
      <Header size="large" />
      <main className="w-full max-w-2xl">
        <CreateGameForm />
        <div className="mt-8 text-center">
          <Link
            href="/leaderboard"
            className="text-sm font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
          >
            View Leaderboard →
          </Link>
        </div>
      </main>
    </div>
  );
}
