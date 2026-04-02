import type { AnswerEntry } from "./gameLogic";
import { shuffle } from "./gameLogic";

export interface SolvedCategory {
  color: string;
  category: string;
  words: string[];
}

export interface GameState {
  board: string[];
  solvedCategories: SolvedCategory[];
  selectedWords: Set<string>;
  guessedKeys: Set<string>;
  mistakesRemaining: number;
  gameOver: boolean;
  gameWon: boolean;
  shakeWords: Set<string>;
  revealingRemaining: boolean;
}

export type GameAction =
  | { type: "SELECT_WORD"; word: string }
  | { type: "DESELECT_WORD"; word: string }
  | { type: "DESELECT_ALL" }
  | { type: "SHUFFLE" }
  | { type: "SUBMIT_CORRECT"; entry: AnswerEntry }
  | { type: "SUBMIT_INCORRECT"; guessKey: string }
  | { type: "CLEAR_SHAKE" }
  | { type: "REVEAL_REMAINING"; categories: SolvedCategory[] }
  | { type: "RESET"; board: string[] };

export function createInitialState(board: string[]): GameState {
  return {
    board: shuffle(board),
    solvedCategories: [],
    selectedWords: new Set(),
    guessedKeys: new Set(),
    mistakesRemaining: 4,
    gameOver: false,
    gameWon: false,
    shakeWords: new Set(),
    revealingRemaining: false,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SELECT_WORD": {
      if (state.selectedWords.size >= 4) return state;
      if (state.gameOver) return state;
      const next = new Set(state.selectedWords);
      next.add(action.word);
      return { ...state, selectedWords: next };
    }

    case "DESELECT_WORD": {
      const next = new Set(state.selectedWords);
      next.delete(action.word);
      return { ...state, selectedWords: next };
    }

    case "DESELECT_ALL":
      return { ...state, selectedWords: new Set() };

    case "SHUFFLE":
      return { ...state, board: shuffle(state.board) };

    case "SUBMIT_CORRECT": {
      const newBoard = state.board.filter(
        (w) => !action.entry.words.includes(w)
      );
      const guessKey = [...action.entry.words]
        .sort((a, b) => a.localeCompare(b))
        .join("|");
      const newSolved = [
        ...state.solvedCategories,
        {
          color: action.entry.color,
          category: action.entry.category,
          words: action.entry.words,
        },
      ];
      const won = newSolved.length === 4;
      return {
        ...state,
        board: newBoard,
        solvedCategories: newSolved,
        selectedWords: new Set(),
        guessedKeys: new Set(state.guessedKeys).add(guessKey),
        gameOver: won,
        gameWon: won,
      };
    }

    case "SUBMIT_INCORRECT": {
      const remaining = state.mistakesRemaining - 1;
      return {
        ...state,
        mistakesRemaining: remaining,
        shakeWords: new Set(state.selectedWords),
        guessedKeys: new Set(state.guessedKeys).add(action.guessKey),
        gameOver: remaining === 0,
      };
    }

    case "CLEAR_SHAKE":
      return {
        ...state,
        shakeWords: new Set(),
        selectedWords: state.gameOver ? state.selectedWords : new Set(),
      };

    case "REVEAL_REMAINING":
      return {
        ...state,
        board: [],
        solvedCategories: [...state.solvedCategories, ...action.categories],
        selectedWords: new Set(),
        revealingRemaining: true,
      };

    case "RESET":
      return createInitialState(action.board);

    default:
      return state;
  }
}
