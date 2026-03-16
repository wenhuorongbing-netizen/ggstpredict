import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCharacterName } from "../lib/tournament-data";

const characterCases = [
  { name: "normalizeCharacterName keeps Sol canonical", input: "Sol", expected: "Sol" },
  { name: "normalizeCharacterName maps lowercase Sol", input: "sol", expected: "Sol" },
  { name: "normalizeCharacterName maps Sol Badguy alias", input: "sol badguy", expected: "Sol" },
  { name: "normalizeCharacterName maps Ky Kiske alias", input: "KY KISKE", expected: "Ky" },
  { name: "normalizeCharacterName maps Axl Low alias", input: "axl low", expected: "Axl" },
  { name: "normalizeCharacterName maps Ramlethal Valentine alias", input: "ramlethal valentine", expected: "Ramlethal" },
  { name: "normalizeCharacterName maps Leo Whitefang alias", input: "LEO WHITEFANG", expected: "Leo" },
  { name: "normalizeCharacterName maps I-No alias", input: "i-no", expected: "I-No" },
  { name: "normalizeCharacterName maps I-No shorthand alias", input: "INO", expected: "I-No" },
  { name: "normalizeCharacterName maps Goldlewis Dickinson alias", input: "goldlewis dickinson", expected: "Goldlewis" },
  { name: "normalizeCharacterName maps Jack-O alias", input: "jack-o", expected: "Jack-O'" },
  { name: "normalizeCharacterName maps Happy Chaos alias", input: "happy chaos", expected: "Happy Chaos" },
  { name: "normalizeCharacterName maps Bedman alias", input: "bedman", expected: "Bedman?" },
  { name: "normalizeCharacterName maps Asuka R# alias", input: "asuka r#", expected: "Asuka" },
  { name: "normalizeCharacterName maps Zato shorthand alias", input: "zato1", expected: "Zato-1" },
  { name: "normalizeCharacterName maps Nago shorthand alias", input: "nago", expected: "Nagoriyuki" },
  { name: "normalizeCharacterName maps A.B.A shorthand alias", input: "aba", expected: "A.B.A" },
  { name: "normalizeCharacterName maps Queen Dizzy alias", input: "queen dizzy", expected: "Dizzy" },
  { name: "normalizeCharacterName returns null for empty strings", input: "   ", expected: null },
  { name: "normalizeCharacterName preserves unknown names after trimming", input: "  Robo Ky  ", expected: "Robo Ky" },
] as const;

for (const testCase of characterCases) {
  test(testCase.name, () => {
    assert.equal(normalizeCharacterName(testCase.input), testCase.expected);
  });
}
