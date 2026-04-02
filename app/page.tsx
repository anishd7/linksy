"use client";

import { Header } from "@/components/Header";
import { CreateGameForm } from "@/components/CreateGameForm";

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-full px-4 pb-12">
      <Header size="large" />
      <main className="w-full max-w-2xl">
        <CreateGameForm />
      </main>
    </div>
  );
}
