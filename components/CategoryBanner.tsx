"use client";

const COLOR_MAP: Record<string, string> = {
  yellow: "bg-[#F9DF6D]",
  green: "bg-[#A0C35A]",
  blue: "bg-[#B0C4EF]",
  purple: "bg-[#BA81C5]",
};

interface CategoryBannerProps {
  color: string;
  category: string;
  words: string[];
  animate?: boolean;
  delay?: number;
}

export function CategoryBanner({
  color,
  category,
  words,
  animate = true,
  delay = 0,
}: CategoryBannerProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center rounded-lg min-h-[56px] px-4 py-3
        ${COLOR_MAP[color] ?? "bg-gray-300"}
        ${animate ? "animate-slide-down" : ""}
      `}
      style={animate && delay > 0 ? { animationDelay: `${delay}ms`, opacity: 0 } : undefined}
    >
      <span className="font-bold text-sm uppercase tracking-wider text-[#1A1A1A]">
        {category}
      </span>
      <span className="text-xs text-[#1A1A1A]/70 mt-0.5">
        {words.join(", ")}
      </span>
    </div>
  );
}
