import { customAlphabet } from "nanoid";

const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
export const generateGameId = customAlphabet(alphabet, 8);
