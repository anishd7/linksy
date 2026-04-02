import type { GameData } from "./db";

const COLORS = ["yellow", "green", "blue", "purple"] as const;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateGameData(
  data: unknown
): { valid: true; gameData: GameData } | { valid: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: [{ field: "root", message: "Invalid request body" }] };
  }

  const obj = data as Record<string, unknown>;
  const allWords: string[] = [];

  for (const color of COLORS) {
    const group = obj[color];
    if (!group || typeof group !== "object") {
      errors.push({ field: color, message: `Missing ${color} category` });
      continue;
    }

    const g = group as Record<string, unknown>;

    // Validate category name
    if (typeof g.category !== "string" || g.category.trim() === "") {
      errors.push({ field: `${color}.category`, message: `${color} category name is required` });
    } else if (g.category.trim().length > 40) {
      errors.push({
        field: `${color}.category`,
        message: `${color} category name must be 40 characters or fewer`,
      });
    }

    // Validate words
    if (!Array.isArray(g.words) || g.words.length !== 4) {
      errors.push({ field: `${color}.words`, message: `${color} must have exactly 4 words` });
      continue;
    }

    for (let i = 0; i < 4; i++) {
      const word = g.words[i];
      if (typeof word !== "string" || word.trim() === "") {
        errors.push({
          field: `${color}.words[${i}]`,
          message: `${color} word ${i + 1} is required`,
        });
      } else if (word.trim().length > 20) {
        errors.push({
          field: `${color}.words[${i}]`,
          message: `${color} word ${i + 1} must be 20 characters or fewer`,
        });
      } else {
        allWords.push(word.trim().toLowerCase());
      }
    }
  }

  // Check uniqueness
  const seen = new Set<string>();
  for (const word of allWords) {
    if (seen.has(word)) {
      errors.push({ field: "words", message: `Duplicate word: "${word}"` });
    }
    seen.add(word);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Build clean game data with sorted words
  const gameData = {} as GameData;
  for (const color of COLORS) {
    const g = (obj[color] as Record<string, unknown>);
    const words = (g.words as string[]).map((w) => w.trim().toLowerCase());
    words.sort((a, b) => a.localeCompare(b));
    gameData[color] = {
      category: (g.category as string).trim(),
      words,
    };
  }

  return { valid: true, gameData };
}
