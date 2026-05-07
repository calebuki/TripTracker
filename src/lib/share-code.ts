import { customAlphabet } from "nanoid";

const TRIP_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const TRIP_CODE_LENGTH = 5;

const generator = customAlphabet(TRIP_CODE_ALPHABET, TRIP_CODE_LENGTH);

export function generateShareCode() {
  return generator();
}

export function normalizeShareCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidShareCode(value: string) {
  return /^[A-Z0-9]{5}$/.test(value);
}
