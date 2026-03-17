import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAwtKoreaBracketPlaceholderMatches,
  buildAwtKoreaBracketTemplate,
  formatMatchRef,
  parseMatchRef,
  resolveBracketDisplayMatches,
} from "../lib/awt-korea-bracket";

test("buildAwtKoreaBracketTemplate returns the expected skeleton size", () => {
  const template = buildAwtKoreaBracketTemplate();

  assert.equal(template.length, 12);
  assert.equal(template[0]?.roundName, "Play-In");
  assert.equal(template.at(-1)?.roundName, "Grand Final");
});

test("formatMatchRef and parseMatchRef preserve target slot", () => {
  const ref = formatMatchRef("match-123", "B");
  assert.equal(ref, "match-123|B");
  assert.deepEqual(parseMatchRef(ref), { matchId: "match-123", slot: "B" });
});

test("placeholder bracket fills group winners when standings are available", () => {
  const placeholders = buildAwtKoreaBracketPlaceholderMatches({
    A: [
      { name: "Tyurara", points: 5, charName: "Sol" },
      { name: "Tatuma", points: 3, charName: "Ky" },
    ],
    B: [
      { name: "Leffen", points: 4, charName: "May" },
      { name: "Dase", points: 2, charName: "Faust" },
    ],
  });

  const winnersSemi = placeholders.find((match) => match.key === "awt-ws-1");
  const playIn = placeholders.find((match) => match.key === "awt-playin-1");

  assert.equal(winnersSemi?.playerA, "Tyurara");
  assert.equal(winnersSemi?.playerB, "Leffen");
  assert.equal(playIn?.playerA, "Tatuma");
  assert.equal(playIn?.playerB, "Dase");
});

test("resolveBracketDisplayMatches replaces group placeholders with current standings", () => {
  const matches = resolveBracketDisplayMatches([
    {
      id: "group-a",
      playerA: "Tyurara",
      playerB: "Tatuma",
      charA: "Sol",
      charB: "Ky",
      stageType: "GROUP",
      groupId: "A",
      status: "SETTLED",
      scoreA: 3,
      scoreB: 1,
      winner: "A",
    },
    {
      id: "group-a-2",
      playerA: "Tyurara",
      playerB: "Leffen",
      charA: "Sol",
      charB: "May",
      stageType: "GROUP",
      groupId: "A",
      status: "SETTLED",
      scoreA: 3,
      scoreB: 0,
      winner: "A",
    },
    {
      id: "group-a-3",
      playerA: "Tatuma",
      playerB: "Leffen",
      charA: "Ky",
      charB: "May",
      stageType: "GROUP",
      groupId: "A",
      status: "SETTLED",
      scoreA: 3,
      scoreB: 2,
      winner: "A",
    },
    {
      id: "bracket-slot",
      playerA: "A组第一",
      playerB: "A组第二",
      charA: null,
      charB: null,
      stageType: "BRACKET",
      roundName: "Winners Semi",
      status: "LOCKED",
      winner: null,
      scoreA: null,
      scoreB: null,
    },
  ]);

  const bracketSlot = matches.find((match) => match.id === "bracket-slot");
  assert.equal(bracketSlot?.playerA, "Tyurara");
  assert.equal(bracketSlot?.playerB, "Tatuma");
  assert.equal(bracketSlot?.charA, "Sol");
  assert.equal(bracketSlot?.charB, "Ky");
});
