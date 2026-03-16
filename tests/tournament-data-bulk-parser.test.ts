import test from "node:test";
import assert from "node:assert/strict";

import { parseBulkMatchInput } from "../lib/tournament-data";

const bulkCases = [
  {
    name: "parseBulkMatchInput parses a single versus line",
    input: "Tyurara vs Nage",
    seedPlayers: [],
    expectedMatches: [{ playerA: "Tyurara", playerB: "Nage", charA: null, charB: null }],
  },
  {
    name: "parseBulkMatchInput ignores empty lines",
    input: "\nTyurara vs Nage\n",
    seedPlayers: [],
    expectedMatches: [{ playerA: "Tyurara", playerB: "Nage", charA: null, charB: null }],
  },
  {
    name: "parseBulkMatchInput ignores non-match lines",
    input: "not a match\nTyurara vs Nage",
    seedPlayers: [],
    expectedMatches: [{ playerA: "Tyurara", playerB: "Nage", charA: null, charB: null }],
  },
  {
    name: "parseBulkMatchInput parses characters from both sides",
    input: "Tyurara (sol badguy) vs Nage (KY KISKE)",
    seedPlayers: [],
    expectedMatches: [{ playerA: "Tyurara", playerB: "Nage", charA: "Sol", charB: "Ky" }],
  },
  {
    name: "parseBulkMatchInput preserves first casing inside one batch",
    input: "Tyurara vs Nage\ntyurara vs Leffen",
    seedPlayers: [],
    expectedMatches: [
      { playerA: "Tyurara", playerB: "Nage", charA: null, charB: null },
      { playerA: "Tyurara", playerB: "Leffen", charA: null, charB: null },
    ],
  },
  {
    name: "parseBulkMatchInput respects seeded player casing",
    input: "tyurara vs Nage",
    seedPlayers: ["Tyurara"],
    expectedMatches: [{ playerA: "Tyurara", playerB: "Nage", charA: null, charB: null }],
  },
  {
    name: "parseBulkMatchInput supports vs. with a trailing dot",
    input: "Tyurara vs. Nage",
    seedPlayers: [],
    expectedMatches: [{ playerA: "Tyurara", playerB: "Nage", charA: null, charB: null }],
  },
  {
    name: "parseBulkMatchInput normalizes whitespace around names",
    input: "  Tyurara   vs   Nage  ",
    seedPlayers: [],
    expectedMatches: [{ playerA: "Tyurara", playerB: "Nage", charA: null, charB: null }],
  },
  {
    name: "parseBulkMatchInput keeps match order",
    input: "A vs B\nC vs D",
    seedPlayers: [],
    expectedMatches: [
      { playerA: "A", playerB: "B", charA: null, charB: null },
      { playerA: "C", playerB: "D", charA: null, charB: null },
    ],
  },
  {
    name: "parseBulkMatchInput keeps same-name mirror matches if typed manually",
    input: "Tyurara vs tyurara",
    seedPlayers: [],
    expectedMatches: [{ playerA: "Tyurara", playerB: "Tyurara", charA: null, charB: null }],
  },
] as const;

for (const testCase of bulkCases) {
  test(testCase.name, () => {
    const parsed = parseBulkMatchInput(testCase.input, testCase.seedPlayers);
    assert.deepEqual(parsed.matches, testCase.expectedMatches);
  });
}

const recentPlayerCases = [
  {
    name: "parseBulkMatchInput returns parsed players in recentPlayers",
    input: "Tyurara vs Nage",
    seedPlayers: [],
    expectedRecentPlayers: ["Tyurara", "Nage"],
  },
  {
    name: "parseBulkMatchInput keeps seeded players before new players",
    input: "Leffen vs Nage",
    seedPlayers: ["Tyurara"],
    expectedRecentPlayers: ["Tyurara", "Leffen", "Nage"],
  },
  {
    name: "parseBulkMatchInput deduplicates seeded players case-insensitively",
    input: "Leffen vs Nage",
    seedPlayers: ["Tyurara", "tyurara"],
    expectedRecentPlayers: ["Tyurara", "Leffen", "Nage"],
  },
  {
    name: "parseBulkMatchInput deduplicates parsed players case-insensitively",
    input: "Tyurara vs Nage\ntyurara vs Leffen",
    seedPlayers: [],
    expectedRecentPlayers: ["Tyurara", "Nage", "Leffen"],
  },
  {
    name: "parseBulkMatchInput caps recentPlayers at sixteen entries",
    input: "P1 vs P2\nP3 vs P4\nP5 vs P6\nP7 vs P8\nP9 vs P10\nP11 vs P12\nP13 vs P14\nP15 vs P16\nP17 vs P18",
    seedPlayers: [],
    expectedRecentPlayers: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12", "P13", "P14", "P15", "P16"],
  },
  {
    name: "parseBulkMatchInput returns seeded players when input is empty",
    input: "",
    seedPlayers: ["Tyurara", "Nage"],
    expectedRecentPlayers: ["Tyurara", "Nage"],
  },
  {
    name: "parseBulkMatchInput ignores invalid lines in recentPlayers updates",
    input: "invalid line only",
    seedPlayers: ["Tyurara"],
    expectedRecentPlayers: ["Tyurara"],
  },
  {
    name: "parseBulkMatchInput canonicalizes seeded casing for recentPlayers",
    input: "tyurara vs Leffen",
    seedPlayers: ["Tyurara"],
    expectedRecentPlayers: ["Tyurara", "Leffen"],
  },
  {
    name: "parseBulkMatchInput preserves character aliases without affecting player order",
    input: "Tyurara (sol) vs Nage (ky)\nLeffen (queen dizzy) vs Hotashi (bedman)",
    seedPlayers: [],
    expectedRecentPlayers: ["Tyurara", "Nage", "Leffen", "Hotashi"],
  },
  {
    name: "parseBulkMatchInput treats VS case-insensitively",
    input: "Tyurara VS Nage",
    seedPlayers: [],
    expectedRecentPlayers: ["Tyurara", "Nage"],
  },
] as const;

for (const testCase of recentPlayerCases) {
  test(testCase.name, () => {
    const parsed = parseBulkMatchInput(testCase.input, testCase.seedPlayers);
    assert.deepEqual(parsed.recentPlayers, testCase.expectedRecentPlayers);
  });
}
