"use client";

import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  selectedCount: number;
  gameOver: boolean;
  onShuffle: () => void;
  onDeselectAll: () => void;
  onSubmit: () => void;
}

export function ActionButtons({
  selectedCount,
  gameOver,
  onShuffle,
  onDeselectAll,
  onSubmit,
}: ActionButtonsProps) {
  if (gameOver) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-3">
      <Button variant="outline" size="lg" onClick={onShuffle} className="min-w-[100px]">
        Shuffle
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={onDeselectAll}
        disabled={selectedCount === 0}
        className="min-w-[120px]"
      >
        Deselect All
      </Button>
      <Button
        size="lg"
        onClick={onSubmit}
        disabled={selectedCount !== 4}
        className="min-w-[100px] bg-[#1A1A1A] text-white hover:bg-[#333]"
      >
        Submit
      </Button>
    </div>
  );
}
