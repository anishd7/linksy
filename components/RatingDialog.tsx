"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendEvent } from "@/lib/api";

interface RatingDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: string;
}

export function RatingDialog({ open, onClose, gameId }: RatingDialogProps) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (selected === 0) return;
    sendEvent(gameId, { type: "rating", stars: selected });
    setSubmitted(true);
    toast.success("Thanks for rating!");
    onClose();
  }

  if (submitted) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle className="text-center font-heading text-2xl">
            Rate this puzzle
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-5 py-4">
          <div
            className="flex gap-2"
            onMouseLeave={() => setHovered(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onClick={() => setSelected(star)}
                className="text-3xl transition-transform hover:scale-110 focus:outline-none"
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
              >
                <span
                  className={
                    star <= (hovered || selected)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }
                >
                  ★
                </span>
              </button>
            ))}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={selected === 0}
            className="w-full bg-[#1A1A1A] text-white hover:bg-[#333]"
          >
            Submit Rating
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
