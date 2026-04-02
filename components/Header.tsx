import Link from "next/link";

export function Header({ size = "large" }: { size?: "large" | "small" }) {
  const isLarge = size === "large";

  return (
    <header className="w-full text-center py-6">
      <Link href="/" className="inline-block">
        <h1
          className={`font-heading tracking-tight text-[#1A1A1A] ${
            isLarge ? "text-5xl" : "text-3xl"
          }`}
        >
          Linksy
        </h1>
      </Link>
      {isLarge && (
        <p className="mt-2 text-[#6B6B6B] text-lg">
          Create your own Connections puzzle
        </p>
      )}
    </header>
  );
}
