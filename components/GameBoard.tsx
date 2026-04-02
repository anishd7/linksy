"use client";

import { useReducer, useCallback, useEffect, useRef, useState, useMemo } from "react";
import type { GameData } from "@/lib/db";
import { buildAnswerKey, checkGuess, getAllWords } from "@/lib/gameLogic";
import { createInitialState, gameReducer } from "@/lib/gameReducer";
import type { AnswerEntry } from "@/lib/gameLogic";
import type { SolvedCategory } from "@/lib/gameReducer";
import { WordTile } from "./WordTile";
import { CategoryBanner } from "./CategoryBanner";
import { MistakesIndicator } from "./MistakesIndicator";
import { ActionButtons } from "./ActionButtons";
import { RatingDialog } from "./RatingDialog";
import { Button } from "@/components/ui/button";
import { sendEvent } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";

interface GameBoardProps {
  gameId: string;
  gameData: GameData;
}

export function GameBoard({ gameId, gameData }: GameBoardProps) {
  const answerKey = useRef<Map<string, AnswerEntry>>(
    buildAnswerKey(gameData)
  );

  const allWords = useMemo(() => getAllWords(gameData), [gameData]);
  const [state, dispatch] = useReducer(gameReducer, allWords, createInitialState);
  const [showRating, setShowRating] = useState(false);
  const completionFired = useRef(false);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ratingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggle = useCallback(
    (word: string) => {
      if (state.gameOver) return;
      if (state.selectedWords.has(word)) {
        dispatch({ type: "DESELECT_WORD", word });
      } else {
        dispatch({ type: "SELECT_WORD", word });
      }
    },
    [state.gameOver, state.selectedWords]
  );

  const handleShuffle = useCallback(() => dispatch({ type: "SHUFFLE" }), []);
  const handleDeselectAll = useCallback(
    () => dispatch({ type: "DESELECT_ALL" }),
    []
  );

  const handleSubmit = useCallback(() => {
    const selected = Array.from(state.selectedWords);
    if (selected.length !== 4) return;

    const guessKey = [...selected].sort((a, b) => a.localeCompare(b)).join("|");
    if (state.guessedKeys.has(guessKey)) {
      toast("Already guessed!", { duration: 2000 });
      return;
    }

    const match = checkGuess(selected, answerKey.current);
    if (match) {
      dispatch({ type: "SUBMIT_CORRECT", entry: match });
    } else {
      dispatch({ type: "SUBMIT_INCORRECT", guessKey });
      // Clear shake after animation
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
      shakeTimeoutRef.current = setTimeout(
        () => dispatch({ type: "CLEAR_SHAKE" }),
        450
      );
    }
  }, [state.selectedWords, state.guessedKeys]);

  const handleReplay = useCallback(() => {
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    if (ratingTimeoutRef.current) clearTimeout(ratingTimeoutRef.current);
    shakeTimeoutRef.current = null;
    revealTimeoutRef.current = null;
    ratingTimeoutRef.current = null;
    completionFired.current = false;
    setShowRating(false);
    dispatch({ type: "RESET", board: allWords });
  }, [allWords]);

  // Handle game over: reveal remaining + fire events
  useEffect(() => {
    if (!state.gameOver || completionFired.current) return;
    completionFired.current = true;

    sendEvent(gameId, { type: "completed" });

    // If loss, reveal remaining categories
    if (!state.gameWon && !state.revealingRemaining) {
      const remaining: SolvedCategory[] = [];
      for (const [color, data] of Object.entries(gameData)) {
        const alreadySolved = state.solvedCategories.some(
          (s) => s.color === color
        );
        if (!alreadySolved) {
          remaining.push({
            color,
            category: data.category,
            words: data.words,
          });
        }
      }
      revealTimeoutRef.current = setTimeout(() => {
        dispatch({ type: "REVEAL_REMAINING", categories: remaining });
      }, 600);
    }

    // Show rating dialog after delay
    ratingTimeoutRef.current = setTimeout(() => setShowRating(true), 1500);
  }, [state.gameOver, state.gameWon, state.revealingRemaining, state.solvedCategories, gameData, gameId]);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
      if (ratingTimeoutRef.current) clearTimeout(ratingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Solved categories */}
      <div className="space-y-2 mb-2">
        {state.solvedCategories.map((cat, idx) => (
          <CategoryBanner
            key={cat.color}
            color={cat.color}
            category={cat.category}
            words={cat.words}
            animate={true}
            delay={state.revealingRemaining ? idx * 200 : 0}
          />
        ))}
      </div>

      {/* Word grid */}
      {state.board.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {state.board.map((word) => (
            <WordTile
              key={word}
              word={word}
              isSelected={state.selectedWords.has(word)}
              isShaking={state.shakeWords.has(word)}
              disabled={
                state.gameOver ||
                (!state.selectedWords.has(word) &&
                  state.selectedWords.size >= 4)
              }
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Game over message */}
      {state.gameOver && (
        <div className="text-center py-6">
          <p className="font-heading text-2xl text-[#1A1A1A] mb-4">
            {state.gameWon ? "Congratulations!" : "Better luck next time"}
          </p>
          <Link
            href="/"
            className="text-[#6B6B6B] hover:text-[#1A1A1A] underline underline-offset-4 text-sm"
          >
            Create your own puzzle
          </Link>
          <div className="mt-4">
            <Button
              onClick={handleReplay}
              className="bg-[#1A1A1A] text-white hover:bg-[#333]"
            >
              Replay
            </Button>
          </div>
        </div>
      )}

      {/* Mistakes + action buttons */}
      {!state.gameOver && (
        <>
          <MistakesIndicator remaining={state.mistakesRemaining} />
          <ActionButtons
            selectedCount={state.selectedWords.size}
            gameOver={state.gameOver}
            onShuffle={handleShuffle}
            onDeselectAll={handleDeselectAll}
            onSubmit={handleSubmit}
          />
        </>
      )}

      {/* Rating dialog */}
      <RatingDialog
        open={showRating}
        onClose={() => setShowRating(false)}
        gameId={gameId}
      />
    </div>
  );
}
