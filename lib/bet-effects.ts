export interface FatalPredictionInput {
  choice: "A" | "B";
  predictedScoreA?: number | null;
  predictedScoreB?: number | null;
}

export interface FatalResolutionInput extends FatalPredictionInput {
  usedFatalCounter: boolean;
  winner: "A" | "B";
  scoreA?: number | null;
  scoreB?: number | null;
  profit: number;
}

export function hasExactScores(scoreA?: number | null, scoreB?: number | null) {
  return Number.isInteger(scoreA) && scoreA! >= 0 && Number.isInteger(scoreB) && scoreB! >= 0;
}

export function validateFatalPrediction(input: FatalPredictionInput) {
  if (!hasExactScores(input.predictedScoreA, input.predictedScoreB)) {
    return "使用致命打康时，必须填写完整比分。";
  }

  if (input.choice === "A" && input.predictedScoreA! <= input.predictedScoreB!) {
    return "押注 A 方时，预测比分必须是 A 方获胜";
  }

  if (input.choice === "B" && input.predictedScoreB! <= input.predictedScoreA!) {
    return "押注 B 方时，预测比分必须是 B 方获胜";
  }

  return null;
}

export function shouldPreserveStreakOnLoss(usedFdShield: boolean) {
  return usedFdShield;
}

export function isFatalCounterExactHit(input: FatalResolutionInput) {
  if (!input.usedFatalCounter) {
    return false;
  }

  if (!hasExactScores(input.predictedScoreA, input.predictedScoreB)) {
    return false;
  }

  if (!hasExactScores(input.scoreA, input.scoreB)) {
    return false;
  }

  return (
    input.choice === input.winner &&
    input.predictedScoreA === input.scoreA &&
    input.predictedScoreB === input.scoreB
  );
}

export function getFatalCounterBonus(input: FatalResolutionInput) {
  if (!isFatalCounterExactHit(input)) {
    return 0;
  }

  return input.profit * 0.5;
}

export function validateSettledScore(winner: "A" | "B", scoreA?: number | null, scoreB?: number | null) {
  if (!hasExactScores(scoreA, scoreB)) {
    return "本场存在比分相关结算，必须填写有效小分";
  }

  if (winner === "A" && scoreA! <= scoreB!) {
    return "胜者为 A 时，比分必须是 A 方领先";
  }

  if (winner === "B" && scoreB! <= scoreA!) {
    return "胜者为 B 时，比分必须是 B 方领先";
  }

  return null;
}
