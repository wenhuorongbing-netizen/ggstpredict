import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateProgressionUpdate, TopologyMap, MatchState } from "../lib/bracket-progression";

test("calculateProgressionUpdate fills correct explicit slot and leaves LOCKED", () => {
  const topology: TopologyMap = {
    "M1": { winner: { matchId: "M2", slot: "A" } }
  };
  const targetState: MatchState = { id: "M2", playerA: "[ TBD ]", playerB: "[ TBD ]", status: "LOCKED" };

  const update = calculateProgressionUpdate(topology, "M1", "Umisho", "winner", targetState);
  assert.deepEqual(update, { playerA: "Umisho" });
});

test("calculateProgressionUpdate changes status to OPEN when both slots are filled", () => {
  const topology: TopologyMap = {
    "M1": { winner: { matchId: "M2", slot: "B" } }
  };
  const targetState: MatchState = { id: "M2", playerA: "TempestNYC", playerB: "[ TBD ]", status: "LOCKED" };

  const update = calculateProgressionUpdate(topology, "M1", "Umisho", "winner", targetState);
  assert.deepEqual(update, { playerB: "Umisho", status: "OPEN" });
});

test("calculateProgressionUpdate throws error on collision", () => {
  const topology: TopologyMap = {
    "M1": { winner: { matchId: "M2", slot: "A" } }
  };
  const targetState: MatchState = { id: "M2", playerA: "Zando", playerB: "[ TBD ]", status: "LOCKED" };

  assert.throws(
    () => calculateProgressionUpdate(topology, "M1", "Umisho", "winner", targetState),
    /Progression Conflict: Target slot A is already occupied by Zando/
  );
});

test("calculateProgressionUpdate allows overwrite if player is the same", () => {
  const topology: TopologyMap = {
    "M1": { winner: { matchId: "M2", slot: "A" } }
  };
  const targetState: MatchState = { id: "M2", playerA: "Umisho", playerB: "[ TBD ]", status: "LOCKED" };

  const update = calculateProgressionUpdate(topology, "M1", "Umisho", "winner", targetState);
  assert.deepEqual(update, { playerA: "Umisho" }); // no status change because B is still TBD
});

test("calculateProgressionUpdate returns null if no topology", () => {
  const update = calculateProgressionUpdate(null, "M1", "Umisho", "winner", { id: "M2", playerA: "[ TBD ]", playerB: "[ TBD ]", status: "LOCKED" });
  assert.equal(update, null);
});
