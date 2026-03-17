import test from "node:test";
import assert from "node:assert/strict";

import {
  hasScheduledBettingClosed,
  isMatchBettingClosed,
  parseBettingCloseDate,
  resolveBettingClosesAt,
} from "../lib/match-betting";

test("parseBettingCloseDate parses ISO strings", () => {
  const parsed = parseBettingCloseDate("2026-03-16T20:45:00.000Z");
  assert.ok(parsed instanceof Date);
  assert.equal(parsed?.toISOString(), "2026-03-16T20:45:00.000Z");
});

test("parseBettingCloseDate returns null for invalid input", () => {
  assert.equal(parseBettingCloseDate("not-a-date"), null);
  assert.equal(parseBettingCloseDate(null), null);
});

test("hasScheduledBettingClosed returns true after the scheduled time", () => {
  assert.equal(
    hasScheduledBettingClosed(
      { bettingClosesAt: "2026-03-16T20:00:00.000Z" },
      new Date("2026-03-16T20:00:01.000Z"),
    ),
    true,
  );
});

test("isMatchBettingClosed respects non-open matches", () => {
  assert.equal(
    isMatchBettingClosed(
      { status: "LOCKED", bettingClosesAt: "2099-01-01T00:00:00.000Z" },
      new Date("2026-03-16T20:00:00.000Z"),
    ),
    true,
  );
});

test("resolveBettingClosesAt supports delay mode", () => {
  const closesAt = resolveBettingClosesAt(
    { mode: "DELAY", delayMinutes: 15 },
    new Date("2026-03-16T20:00:00.000Z"),
  );

  assert.equal(closesAt.toISOString(), "2026-03-16T20:15:00.000Z");
});

test("resolveBettingClosesAt rejects invalid delay values", () => {
  assert.throws(
    () => resolveBettingClosesAt({ mode: "DELAY", delayMinutes: 0 }),
    /封盘分钟数必须大于 0/,
  );
});

test("resolveBettingClosesAt supports absolute mode", () => {
  const closesAt = resolveBettingClosesAt({
    mode: "AT",
    closeAt: "2026-03-16T22:30:00.000Z",
  });

  assert.equal(closesAt.toISOString(), "2026-03-16T22:30:00.000Z");
});
