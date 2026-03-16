import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCanonicalMaps,
  buildCharacterCanonicalMap,
  buildDefaultPlayerRoster,
  canonicalizePlayerName,
  getCanonicalMatchUpdates,
  normalizeMatchEntry,
  normalizePlayerRoster,
  parsePlayerRosterSetting,
  serializePlayerRosterSetting,
} from "../lib/tournament-data";

const updateCases = [
  {
    name: "getCanonicalMatchUpdates returns no updates when records are already canonical",
    matches: [{ id: "1", playerA: "Tyurara", playerB: "Nage", charA: "Sol", charB: "Ky" }],
    assertResult: (updates: ReturnType<typeof getCanonicalMatchUpdates>) => assert.deepEqual(updates, []),
  },
  {
    name: "getCanonicalMatchUpdates normalizes player casing using the majority variant",
    matches: [
      { id: "1", playerA: "tyurara", playerB: "Nage" },
      { id: "2", playerA: "tyurara", playerB: "Leffen" },
      { id: "3", playerA: "Tyurara", playerB: "Hotashi" },
    ],
    assertResult: (updates: ReturnType<typeof getCanonicalMatchUpdates>) => {
      assert.deepEqual(updates, [{ id: "3", playerA: "tyurara", playerB: "Hotashi", charA: null, charB: null }]);
    },
  },
  {
    name: "getCanonicalMatchUpdates normalizes player casing with first-seen tie breaking",
    matches: [
      { id: "1", playerA: "Tyurara", playerB: "Nage" },
      { id: "2", playerA: "tyurara", playerB: "Leffen" },
    ],
    assertResult: (updates: ReturnType<typeof getCanonicalMatchUpdates>) => {
      assert.deepEqual(updates, [{ id: "2", playerA: "Tyurara", playerB: "Leffen", charA: null, charB: null }]);
    },
  },
  {
    name: "getCanonicalMatchUpdates normalizes official character aliases",
    matches: [{ id: "1", playerA: "Tyurara", playerB: "Nage", charA: "sol badguy", charB: "queen dizzy" }],
    assertResult: (updates: ReturnType<typeof getCanonicalMatchUpdates>) => {
      assert.deepEqual(updates, [{ id: "1", playerA: "Tyurara", playerB: "Nage", charA: "Sol", charB: "Dizzy" }]);
    },
  },
  {
    name: "getCanonicalMatchUpdates updates both players in one record when needed",
    matches: [
      { id: "1", playerA: "Tyurara", playerB: "Nage" },
      { id: "2", playerA: "tyurara", playerB: "nage" },
    ],
    assertResult: (updates: ReturnType<typeof getCanonicalMatchUpdates>) => {
      assert.deepEqual(updates, [{ id: "2", playerA: "Tyurara", playerB: "Nage", charA: null, charB: null }]);
    },
  },
  {
    name: "getCanonicalMatchUpdates skips emitting updates for entries without ids but still uses them as history",
    matches: [{ playerA: "tyurara", playerB: "Nage" }, { id: "2", playerA: "Tyurara", playerB: "Nage" }],
    assertResult: (updates: ReturnType<typeof getCanonicalMatchUpdates>) => {
      assert.deepEqual(updates, [{ id: "2", playerA: "tyurara", playerB: "Nage", charA: null, charB: null }]);
    },
  },
  {
    name: "buildCanonicalMaps chooses the most frequent player variant",
    matches: [
      { playerA: "tyurara", playerB: "Nage" },
      { playerA: "tyurara", playerB: "Leffen" },
      { playerA: "Tyurara", playerB: "Hotashi" },
    ],
    assertResult: () => {
      const maps = buildCanonicalMaps([
        { playerA: "tyurara", playerB: "Nage" },
        { playerA: "tyurara", playerB: "Leffen" },
        { playerA: "Tyurara", playerB: "Hotashi" },
      ]);
      assert.equal(maps.playerMap.get("tyurara"), "tyurara");
    },
  },
  {
    name: "buildCharacterCanonicalMap prefers official canonical spellings",
    matches: [{ playerA: "Tyurara", playerB: "Nage", charA: "sol", charB: "jack-o" }],
    assertResult: () => {
      const characterMap = buildCharacterCanonicalMap([{ playerA: "Tyurara", playerB: "Nage", charA: "sol", charB: "jack-o" }]);
      assert.equal(characterMap.get("sol"), "Sol");
      assert.equal(characterMap.get("jacko"), "Jack-O'");
    },
  },
  {
    name: "canonicalizePlayerName uses a provided canonical map",
    matches: [],
    assertResult: () => {
      const playerMap = new Map([["tyurara", "Tyurara"]]);
      assert.equal(canonicalizePlayerName("tyurara", playerMap), "Tyurara");
    },
  },
  {
    name: "normalizeMatchEntry applies player and character maps together",
    matches: [],
    assertResult: () => {
      const normalized = normalizeMatchEntry(
        { playerA: "tyurara", playerB: "nage", charA: "sol", charB: "queen dizzy" },
        new Map([
          ["tyurara", "Tyurara"],
          ["nage", "Nage"],
        ]),
        new Map([
          ["sol", "Sol"],
          ["queendizzy", "Dizzy"],
        ]),
      );
      assert.deepEqual(normalized, { playerA: "Tyurara", playerB: "Nage", charA: "Sol", charB: "Dizzy" });
    },
  },
] as const;

for (const testCase of updateCases) {
  test(testCase.name, () => {
    const updates = getCanonicalMatchUpdates(testCase.matches);
    testCase.assertResult(updates);
  });
}

const rosterCases = [
  {
    name: "normalizePlayerRoster trims and deduplicates entries",
    assertResult: () => {
      assert.deepEqual(normalizePlayerRoster([" Tyurara ", "tyurara", "Nage"]), ["Tyurara", "Nage"]);
    },
  },
  {
    name: "normalizePlayerRoster caps the roster at sixteen players",
    assertResult: () => {
      const roster = normalizePlayerRoster(Array.from({ length: 20 }, (_, index) => `P${index + 1}`));
      assert.equal(roster.length, 16);
      assert.equal(roster[15], "P16");
    },
  },
  {
    name: "buildDefaultPlayerRoster pads with empty slots",
    assertResult: () => {
      const roster = buildDefaultPlayerRoster(["Tyurara", "Nage"]);
      assert.equal(roster.length, 16);
      assert.equal(roster[0], "Tyurara");
      assert.equal(roster[2], "");
    },
  },
  {
    name: "parsePlayerRosterSetting reads JSON arrays",
    assertResult: () => {
      const roster = parsePlayerRosterSetting('["Tyurara","Nage"]');
      assert.equal(roster[0], "Tyurara");
      assert.equal(roster[1], "Nage");
      assert.equal(roster.length, 16);
    },
  },
  {
    name: "parsePlayerRosterSetting reads comma separated text",
    assertResult: () => {
      const roster = parsePlayerRosterSetting("Tyurara,Nage,Leffen");
      assert.deepEqual(roster.slice(0, 3), ["Tyurara", "Nage", "Leffen"]);
    },
  },
  {
    name: "parsePlayerRosterSetting reads newline separated text",
    assertResult: () => {
      const roster = parsePlayerRosterSetting("Tyurara\nNage\nLeffen");
      assert.deepEqual(roster.slice(0, 3), ["Tyurara", "Nage", "Leffen"]);
    },
  },
  {
    name: "parsePlayerRosterSetting returns an empty padded roster for invalid JSON objects",
    assertResult: () => {
      const roster = parsePlayerRosterSetting('{"not":"an array"}');
      assert.equal(roster.length, 16);
      assert.ok(roster.every((entry) => entry === ""));
    },
  },
  {
    name: "serializePlayerRosterSetting strips blanks and duplicates",
    assertResult: () => {
      const serialized = serializePlayerRosterSetting(["Tyurara", "", "tyurara", "Nage"]);
      assert.equal(serialized, '["Tyurara","Nage"]');
    },
  },
  {
    name: "player roster serialize and parse roundtrip is stable",
    assertResult: () => {
      const serialized = serializePlayerRosterSetting(["Tyurara", "Nage", "Leffen"]);
      const roster = parsePlayerRosterSetting(serialized);
      assert.deepEqual(roster.slice(0, 3), ["Tyurara", "Nage", "Leffen"]);
    },
  },
  {
    name: "buildDefaultPlayerRoster keeps the first unique casing",
    assertResult: () => {
      const roster = buildDefaultPlayerRoster(["tyurara", "Tyurara", "Nage"]);
      assert.deepEqual(roster.slice(0, 2), ["tyurara", "Nage"]);
    },
  },
] as const;

for (const testCase of rosterCases) {
  test(testCase.name, () => {
    testCase.assertResult();
  });
}
