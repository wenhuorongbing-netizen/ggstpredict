import test from "node:test";
import assert from "node:assert/strict";

import { buildGroupStandings } from "../lib/tournament-data";

const standingCases = [
  {
    name: "buildGroupStandings adds explicit scores for settled matches",
    matches: [{ playerA: "Tyurara", playerB: "Nage", stageType: "GROUP", groupId: "A", status: "SETTLED", scoreA: 3, scoreB: 1 }],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.equal(result.A[0]?.name, "Tyurara");
      assert.equal(result.A[0]?.points, 3);
      assert.equal(result.A[1]?.points, 1);
    },
  },
  {
    name: "buildGroupStandings falls back to winner when scores are missing",
    matches: [{ playerA: "Tyurara", playerB: "Nage", stageType: "GROUP", groupId: "A", status: "SETTLED", winner: "A" }],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.equal(result.A[0]?.name, "Tyurara");
      assert.equal(result.A[0]?.points, 1);
      assert.equal(result.A[1]?.points, 0);
    },
  },
  {
    name: "buildGroupStandings ignores open matches for scoring",
    matches: [{ playerA: "Tyurara", playerB: "Nage", stageType: "GROUP", groupId: "A", status: "OPEN", scoreA: 3, scoreB: 1 }],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.equal(result.A[0]?.points, 0);
      assert.equal(result.A[1]?.points, 0);
    },
  },
  {
    name: "buildGroupStandings ignores non-group matches",
    matches: [{ playerA: "Tyurara", playerB: "Nage", stageType: "BRACKET", groupId: "A", status: "SETTLED", scoreA: 3, scoreB: 1 }],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.deepEqual(result, {});
    },
  },
  {
    name: "buildGroupStandings merges same player across case variants",
    matches: [
      { playerA: "tyurara", playerB: "Nage", stageType: "GROUP", groupId: "A", status: "SETTLED", scoreA: 3, scoreB: 1 },
      { playerA: "Tyurara", playerB: "Leffen", stageType: "GROUP", groupId: "A", status: "SETTLED", scoreA: 2, scoreB: 0 },
    ],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.equal(result.A.length, 3);
      assert.equal(result.A[0]?.name, "tyurara");
      assert.equal(result.A[0]?.points, 5);
    },
  },
  {
    name: "buildGroupStandings keeps groups sorted alphabetically",
    matches: [
      { playerA: "A", playerB: "B", stageType: "GROUP", groupId: "b", status: "SETTLED", winner: "A" },
      { playerA: "C", playerB: "D", stageType: "GROUP", groupId: "a", status: "SETTLED", winner: "A" },
    ],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.deepEqual(Object.keys(result), ["A", "B"]);
    },
  },
  {
    name: "buildGroupStandings sorts players by points descending",
    matches: [
      { playerA: "A", playerB: "B", stageType: "GROUP", groupId: "A", status: "SETTLED", scoreA: 3, scoreB: 0 },
      { playerA: "C", playerB: "D", stageType: "GROUP", groupId: "A", status: "SETTLED", scoreA: 1, scoreB: 0 },
    ],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.deepEqual(result.A.map((entry) => entry.name), ["A", "C", "B", "D"]);
    },
  },
  {
    name: "buildGroupStandings sorts ties by player name",
    matches: [
      { playerA: "Leffen", playerB: "Nage", stageType: "GROUP", groupId: "A", status: "SETTLED", winner: "A" },
      { playerA: "Hotashi", playerB: "Tyurara", stageType: "GROUP", groupId: "A", status: "SETTLED", winner: "A" },
    ],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.deepEqual(result.A.map((entry) => entry.name).slice(0, 2), ["Hotashi", "Leffen"]);
    },
  },
  {
    name: "buildGroupStandings keeps players with zero points visible",
    matches: [{ playerA: "Tyurara", playerB: "Nage", stageType: "GROUP", groupId: "A", status: "OPEN" }],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.equal(result.A.length, 2);
      assert.equal(result.A[0]?.points, 0);
      assert.equal(result.A[1]?.points, 0);
    },
  },
  {
    name: "buildGroupStandings accepts lowercase group stage labels",
    matches: [{ playerA: "Tyurara", playerB: "Nage", stageType: "group", groupId: "a", status: "SETTLED", winner: "A" }],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.ok(result.A);
    },
  },
  {
    name: "buildGroupStandings awards point to player B when B wins without scores",
    matches: [{ playerA: "Tyurara", playerB: "Nage", stageType: "GROUP", groupId: "A", status: "SETTLED", winner: "B" }],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.equal(result.A[0]?.name, "Nage");
      assert.equal(result.A[0]?.points, 1);
    },
  },
  {
    name: "buildGroupStandings trusts explicit scores even if winner is different",
    matches: [{ playerA: "Tyurara", playerB: "Nage", stageType: "GROUP", groupId: "A", status: "SETTLED", winner: "B", scoreA: 2, scoreB: 3 }],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.equal(result.A[0]?.name, "Nage");
      assert.equal(result.A[0]?.points, 3);
      assert.equal(result.A[1]?.points, 2);
    },
  },
  {
    name: "buildGroupStandings captures first non-empty character for a player",
    matches: [
      { playerA: "Tyurara", playerB: "Nage", charA: null, stageType: "GROUP", groupId: "A", status: "OPEN" },
      { playerA: "Tyurara", playerB: "Leffen", charA: "sol", stageType: "GROUP", groupId: "A", status: "OPEN" },
    ],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      const player = result.A.find((entry) => entry.name === "Tyurara");
      assert.equal(player?.charName, "Sol");
    },
  },
  {
    name: "buildGroupStandings merges the same player found in player B slots",
    matches: [
      { playerA: "Nage", playerB: "tyurara", stageType: "GROUP", groupId: "A", status: "SETTLED", winner: "B" },
      { playerA: "Leffen", playerB: "Tyurara", stageType: "GROUP", groupId: "A", status: "SETTLED", winner: "B" },
    ],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.equal(result.A[0]?.name, "tyurara");
      assert.equal(result.A[0]?.points, 2);
    },
  },
  {
    name: "buildGroupStandings keeps the same player separate across different groups",
    matches: [
      { playerA: "Tyurara", playerB: "Nage", stageType: "GROUP", groupId: "A", status: "SETTLED", winner: "A" },
      { playerA: "tyurara", playerB: "Leffen", stageType: "GROUP", groupId: "B", status: "SETTLED", winner: "A" },
    ],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.equal(result.A[0]?.name, "Tyurara");
      assert.equal(result.B[0]?.name, "Tyurara");
    },
  },
  {
    name: "buildGroupStandings returns an empty object when no valid group matches exist",
    matches: [{ playerA: "Tyurara", playerB: "Nage", stageType: "BRACKET", status: "OPEN" }],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.deepEqual(result, {});
    },
  },
  {
    name: "buildGroupStandings normalizes character aliases for display",
    matches: [{ playerA: "Tyurara", playerB: "Nage", charA: "sol badguy", stageType: "GROUP", groupId: "A", status: "OPEN" }],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      const player = result.A.find((entry) => entry.name === "Tyurara");
      assert.equal(player?.charName, "Sol");
    },
  },
  {
    name: "buildGroupStandings handles multiple settled rounds for the same player",
    matches: [
      { playerA: "Tyurara", playerB: "Nage", stageType: "GROUP", groupId: "A", status: "SETTLED", scoreA: 3, scoreB: 2 },
      { playerA: "Leffen", playerB: "Tyurara", stageType: "GROUP", groupId: "A", status: "SETTLED", scoreA: 1, scoreB: 3 },
    ],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      const player = result.A.find((entry) => entry.name === "Tyurara");
      assert.equal(player?.points, 6);
    },
  },
  {
    name: "buildGroupStandings ignores matches that do not have a group id",
    matches: [{ playerA: "Tyurara", playerB: "Nage", stageType: "GROUP", status: "SETTLED", winner: "A" }],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.deepEqual(result, {});
    },
  },
  {
    name: "buildGroupStandings normalizes uppercase group ids",
    matches: [{ playerA: "Tyurara", playerB: "Nage", stageType: "GROUP", groupId: " a ", status: "SETTLED", winner: "A" }],
    assertResult: (result: ReturnType<typeof buildGroupStandings>) => {
      assert.ok(result.A);
    },
  },
] as const;

for (const testCase of standingCases) {
  test(testCase.name, () => {
    const result = buildGroupStandings(testCase.matches);
    testCase.assertResult(result);
  });
}
