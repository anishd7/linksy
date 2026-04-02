import Link from "next/link";

export function GameNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
      <h2 className="font-heading text-3xl text-[#1A1A1A]">
        This puzzle doesn&apos;t exist.
      </h2>
      <p className="text-[#6B6B6B] text-lg">
        It may have been removed or the link might be wrong.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-lg px-4 h-9 text-sm font-medium bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors"
      >
        Create your own
      </Link>
    </div>
  );
}
