export type BettingCloseMode = "IMMEDIATE" | "DELAY" | "AT";

export interface MatchBettingLike {
  status?: string | null;
  bettingClosesAt?: Date | string | null;
}

export interface BettingCloseInput {
  mode: BettingCloseMode;
  delayMinutes?: number;
  closeAt?: Date | string | null;
}

export function parseBettingCloseDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function hasScheduledBettingClosed(match: MatchBettingLike, now = new Date()): boolean {
  const closesAt = parseBettingCloseDate(match.bettingClosesAt);
  if (!closesAt) {
    return false;
  }

  return closesAt.getTime() <= now.getTime();
}

export function isMatchBettingClosed(match: MatchBettingLike, now = new Date()): boolean {
  if (match.status !== "OPEN") {
    return true;
  }

  return hasScheduledBettingClosed(match, now);
}

export function resolveBettingClosesAt(input: BettingCloseInput, now = new Date()): Date {
  if (input.mode === "IMMEDIATE") {
    return now;
  }

  if (input.mode === "DELAY") {
    const delayMinutes = Number(input.delayMinutes);
    if (!Number.isFinite(delayMinutes) || delayMinutes <= 0) {
      throw new Error("封盘分钟数必须大于 0");
    }

    return new Date(now.getTime() + delayMinutes * 60 * 1000);
  }

  const closeAt = parseBettingCloseDate(input.closeAt ?? null);
  if (!closeAt) {
    throw new Error("指定封盘时间无效");
  }

  return closeAt;
}
