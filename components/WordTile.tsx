"use client";

interface WordTileProps {
  word: string;
  isSelected: boolean;
  isShaking: boolean;
  disabled: boolean;
  onToggle: (word: string) => void;
}

export function WordTile({
  word,
  isSelected,
  isShaking,
  disabled,
  onToggle,
}: WordTileProps) {
  return (
    <button
      onClick={() => onToggle(word)}
      disabled={disabled}
      className={`
        flex items-center justify-center rounded-lg min-h-[56px] px-2 py-3
        text-sm font-semibold uppercase tracking-wide
        transition-all duration-150 ease-out select-none
        ${
          isSelected
            ? "bg-[#2A2A2A] text-white scale-[1.02] shadow-md"
            : "bg-white text-[#1A1A1A] shadow-sm hover:shadow-md hover:scale-[1.01]"
        }
        ${isShaking ? "animate-shake" : ""}
        ${disabled && !isSelected ? "opacity-60 cursor-default" : "cursor-pointer"}
      `}
    >
      {word}
    </button>
  );
}
