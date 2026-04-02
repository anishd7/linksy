"use client";

interface MistakesIndicatorProps {
  remaining: number;
  total?: number;
}

export function MistakesIndicator({
  remaining,
  total = 4,
}: MistakesIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <span className="text-sm text-[#6B6B6B] mr-1">Mistakes remaining:</span>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              i < remaining ? "bg-[#1A1A1A]" : "bg-[#D5D0C8]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
