import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCaseInsensitiveKey,
  formatMatchLine,
  normalizePlayerName,
  normalizeWhitespace,
  parsePlayerAndCharacter,
} from "../lib/tournament-data";

const whitespaceCases = [
  { name: "normalizeWhitespace trims leading and trailing spaces", input: "  tyurara  ", expected: "tyurara" },
  { name: "normalizeWhitespace collapses repeated internal spaces", input: "tyu   rara", expected: "tyu rara" },
  { name: "normalizeWhitespace normalizes full-width letters and spaces", input: "ＴＹＵＲＡＲＡ　SOL", expected: "TYURARA SOL" },
  { name: "normalizeWhitespace handles null values", input: null, expected: "" },
  { name: "normalizeWhitespace preserves punctuation", input: " Jack-O' ", expected: "Jack-O'" },
] as const;

for (const testCase of whitespaceCases) {
  test(testCase.name, () => {
    assert.equal(normalizeWhitespace(testCase.input), testCase.expected);
  });
}

const keyCases = [
  { name: "buildCaseInsensitiveKey lowercases values", input: "Tyurara", expected: "tyurara" },
  { name: "buildCaseInsensitiveKey trims before lowercasing", input: "  ABA  ", expected: "aba" },
  { name: "buildCaseInsensitiveKey collapses repeated whitespace", input: "A  B  A", expected: "a b a" },
] as const;

for (const testCase of keyCases) {
  test(testCase.name, () => {
    assert.equal(buildCaseInsensitiveKey(testCase.input), testCase.expected);
  });
}

const playerNameCases = [
  { name: "normalizePlayerName preserves input casing", input: "Tyurara", expected: "Tyurara" },
  { name: "normalizePlayerName preserves punctuation in tags", input: "A.B.A-Lover", expected: "A.B.A-Lover" },
] as const;

for (const testCase of playerNameCases) {
  test(testCase.name, () => {
    assert.equal(normalizePlayerName(testCase.input), testCase.expected);
  });
}

const parseCases = [
  {
    name: "parsePlayerAndCharacter returns player name when character is missing",
    input: "Tyurara",
    expected: { player: "Tyurara", char: null },
  },
  {
    name: "parsePlayerAndCharacter extracts the character inside parentheses",
    input: "Tyurara (Sol)",
    expected: { player: "Tyurara", char: "Sol" },
  },
  {
    name: "parsePlayerAndCharacter trims player and character text",
    input: "  Tyurara   (  ramlethal valentine ) ",
    expected: { player: "Tyurara", char: "Ramlethal" },
  },
  {
    name: "parsePlayerAndCharacter canonicalizes official character aliases",
    input: "Tyurara (sol badguy)",
    expected: { player: "Tyurara", char: "Sol" },
  },
  {
    name: "parsePlayerAndCharacter keeps stylized characters",
    input: "Tyurara (A.B.A)",
    expected: { player: "Tyurara", char: "A.B.A" },
  },
] as const;

for (const testCase of parseCases) {
  test(testCase.name, () => {
    assert.deepEqual(parsePlayerAndCharacter(testCase.input), testCase.expected);
  });
}

const lineCases = [
  {
    name: "formatMatchLine renders a simple versus line",
    input: { playerA: "Tyurara", playerB: "Nage", charA: null, charB: null },
    expected: "Tyurara vs Nage",
  },
  {
    name: "formatMatchLine includes only player A character when available",
    input: { playerA: "Tyurara", playerB: "Nage", charA: "Sol", charB: null },
    expected: "Tyurara (Sol) vs Nage",
  },
  {
    name: "formatMatchLine includes only player B character when available",
    input: { playerA: "Tyurara", playerB: "Nage", charA: null, charB: "Ky" },
    expected: "Tyurara vs Nage (Ky)",
  },
  {
    name: "formatMatchLine includes both characters when available",
    input: { playerA: "Tyurara", playerB: "Nage", charA: "Sol", charB: "Ky" },
    expected: "Tyurara (Sol) vs Nage (Ky)",
  },
  {
    name: "formatMatchLine keeps canonicalized character spellings intact",
    input: { playerA: "Tyurara", playerB: "Nage", charA: "Jack-O'", charB: "Bedman?" },
    expected: "Tyurara (Jack-O') vs Nage (Bedman?)",
  },
] as const;

for (const testCase of lineCases) {
  test(testCase.name, () => {
    assert.equal(formatMatchLine(testCase.input), testCase.expected);
  });
}
