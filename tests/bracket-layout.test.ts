import test from "node:test";
import assert from "node:assert/strict";
import { groupBracketMatches, BracketMatch } from "../lib/bracket-layout";

test("groupBracketMatches maps standard 8-player bracket to correct buckets", () => {
  const matches: BracketMatch[] = [
    { id: "1", playerA: "Sol", playerB: "Ky", status: "OPEN", roundName: "Winners Quarter-Final 1" },
    { id: "2", playerA: "May", playerB: "Ram", status: "OPEN", roundName: "Winners Quarter-Final 2" },
    { id: "3", playerA: "Zato", playerB: "Chipp", status: "OPEN", roundName: "Winners Semi-Final 1" },
    { id: "4", playerA: "Ino", playerB: "Leo", status: "OPEN", roundName: "Losers Round 1 (1)" },
    { id: "5", playerA: "Pot", playerB: "Axl", status: "OPEN", roundName: "Losers Final" },
    { id: "6", playerA: "Gio", playerB: "Anji", status: "OPEN", roundName: "Grand Final" },
  ];

  const layout = groupBracketMatches(matches);

  assert.equal(layout.winnersMatches.length, 3);
  assert.equal(layout.winnersMatches[0].id, "1"); // sorted exactly as WQF 1
  assert.equal(layout.winnersMatches[1].id, "2"); // sorted exactly as WQF 2
  assert.equal(layout.winnersMatches[2].id, "3"); // sorted exactly as WSF 1

  assert.equal(layout.losersMatches.length, 2);
  assert.equal(layout.losersMatches[0].id, "4");
  assert.equal(layout.losersMatches[1].id, "5");

  assert.equal(layout.grandFinalMatch?.id, "6");
  assert.equal(layout.resetMatch, null);
  assert.equal(layout.otherMatches.length, 0);
});

test("groupBracketMatches hides Grand Final Reset if LOCKED and TBD", () => {
  const matches: BracketMatch[] = [
    { id: "1", playerA: "Sol", playerB: "Ky", status: "OPEN", roundName: "Grand Final" },
    { id: "2", playerA: "[ TBD ]", playerB: "[ TBD ]", status: "LOCKED", roundName: "Grand Final Reset" },
  ];

  const layout = groupBracketMatches(matches);

  assert.equal(layout.grandFinalMatch?.id, "1");
  assert.equal(layout.resetMatch, null); // should be null
  assert.equal(layout.otherMatches.length, 0); // should not be in other matches either
});

test("groupBracketMatches shows Grand Final Reset if OPEN", () => {
  const matches: BracketMatch[] = [
    { id: "1", playerA: "Sol", playerB: "Ky", status: "SETTLED", roundName: "Grand Final" },
    { id: "2", playerA: "Sol", playerB: "Ky", status: "OPEN", roundName: "Grand Final Reset" },
  ];

  const layout = groupBracketMatches(matches);

  assert.equal(layout.grandFinalMatch?.id, "1");
  assert.equal(layout.resetMatch?.id, "2"); // should be shown
  assert.equal(layout.otherMatches.length, 0);
});

test("groupBracketMatches handles unknown roundNames as otherMatches", () => {
  const matches: BracketMatch[] = [
    { id: "1", playerA: "Sol", playerB: "Ky", status: "OPEN", roundName: "Unknown Round" },
    { id: "2", playerA: "May", playerB: "Ram", status: "OPEN", roundName: "Winners Round 3" }, // non-standard string
  ];

  const layout = groupBracketMatches(matches);

  assert.equal(layout.winnersMatches.length, 0);
  assert.equal(layout.losersMatches.length, 0);
  assert.equal(layout.otherMatches.length, 2);
  assert.equal(layout.otherMatches[0].id, "1");
  assert.equal(layout.otherMatches[1].id, "2");
});

test("groupBracketMatches handles duplicate round names", () => {
  const matches: BracketMatch[] = [
    { id: "1", playerA: "Sol", playerB: "Ky", status: "OPEN", roundName: "Winners Quarter-Final 1" },
    { id: "2", playerA: "May", playerB: "Ram", status: "OPEN", roundName: "Winners Quarter-Final 1" },
  ];

  const layout = groupBracketMatches(matches);

  // The first occurrence of "Winners Quarter-Final 1" goes to winnersMatches (actually last one since Map overwrites)
  assert.equal(layout.winnersMatches.length, 1);
  // The overwritten one goes to otherMatches
  assert.equal(layout.otherMatches.length, 1);
});
