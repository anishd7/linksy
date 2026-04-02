import type { GameData } from "./db";

export interface AnswerEntry {
  color: string;
  category: string;
  words: string[];
}

/** Build an answer key map from sorted category words. Key = words joined by "|" */
export function buildAnswerKey(
  gameData: GameData
): Map<string, AnswerEntry> {
  const map = new Map<string, AnswerEntry>();
  for (const [color, data] of Object.entries(gameData)) {
    // Words are already sorted from the backend
    const key = data.words.join("|");
    map.set(key, { color, category: data.category, words: data.words });
  }
  return map;
}

/** Check if a set of selected words matches a category */
export function checkGuess(
  selectedWords: string[],
  answerKey: Map<string, AnswerEntry>
): AnswerEntry | null {
  const sorted = [...selectedWords].sort((a, b) => a.localeCompare(b));
  const key = sorted.join("|");
  return answerKey.get(key) ?? null;
}

/** Fisher-Yates shuffle (returns a new array) */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Collect all 16 words from game data into a flat array */
export function getAllWords(gameData: GameData): string[] {
  return Object.values(gameData).flatMap((cat) => cat.words);
}
