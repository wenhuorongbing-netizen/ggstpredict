import test from "node:test";
import assert from "node:assert/strict";

import {
  getFatalCounterBonus,
  shouldPreserveStreakOnLoss,
  validateFatalPrediction,
  validateSettledScore,
} from "../lib/bet-effects";

test("FD shield preserves streak on loss", () => {
  assert.equal(shouldPreserveStreakOnLoss(true), true);
  assert.equal(shouldPreserveStreakOnLoss(false), false);
});

test("fatal counter requires a winning prediction for the chosen side", () => {
  assert.equal(
    validateFatalPrediction({ choice: "A", predictedScoreA: 2, predictedScoreB: 3 }),
    "押注 A 方时，预测比分必须是 A 方获胜",
  );
  assert.equal(
    validateFatalPrediction({ choice: "B", predictedScoreA: 3, predictedScoreB: 2 }),
    "押注 B 方时，预测比分必须是 B 方获胜",
  );
});

test("fatal counter exact hit grants 50% bonus on pure profit", () => {
  const bonus = getFatalCounterBonus({
    choice: "A",
    usedFatalCounter: true,
    predictedScoreA: 3,
    predictedScoreB: 1,
    winner: "A",
    scoreA: 3,
    scoreB: 1,
    profit: 400,
  });

  assert.equal(bonus, 200);
});

test("fatal counter does not bonus incorrect score or losing side", () => {
  assert.equal(
    getFatalCounterBonus({
      choice: "A",
      usedFatalCounter: true,
      predictedScoreA: 3,
      predictedScoreB: 1,
      winner: "A",
      scoreA: 3,
      scoreB: 2,
      profit: 400,
    }),
    0,
  );

  assert.equal(
    getFatalCounterBonus({
      choice: "A",
      usedFatalCounter: true,
      predictedScoreA: 3,
      predictedScoreB: 1,
      winner: "B",
      scoreA: 2,
      scoreB: 3,
      profit: 400,
    }),
    0,
  );
});

test("settled score validation enforces winner side leading", () => {
  assert.equal(validateSettledScore("A", 3, 2), null);
  assert.equal(validateSettledScore("B", 2, 3), null);
  assert.equal(validateSettledScore("A", 2, 3), "胜者为 A 时，比分必须是 A 方领先");
  assert.equal(validateSettledScore("B", 3, 2), "胜者为 B 时，比分必须是 B 方领先");
});
