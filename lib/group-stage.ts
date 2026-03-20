import { MatchForStandings, calculateGroupStandings } from "./standings";

export type GroupConfirmationState = {
  confirmed: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  groupCode: string;
  top2: string[];
  standings: string[];
};

export type GroupStatus = {
  groupCode: string;
  playerCount: number;
  scheduledMatchCount: number;
  settledMatchCount: number;
  isComplete: boolean;
  isConfirmed: boolean;
  confirmationState: GroupConfirmationState | null;
  top2Provisional: string[];
  standings: string[];
};

export function evaluateGroupStatus(
  groupCode: string,
  matches: MatchForStandings[],
  confirmationState: GroupConfirmationState | null
): GroupStatus {
  const groupMatches = matches.filter(m =>
    (m.groupName === groupCode || m.groupId === groupCode) &&
    m.stageType === "GROUP"
  );

  const players = new Set<string>();
  let settledMatchCount = 0;

  // Track unique pairings to avoid counting duplicates towards completion
  const pairings = new Set<string>();

  for (const m of groupMatches) {
    if (!m.playerA || !m.playerB) continue;

    players.add(m.playerA);
    players.add(m.playerB);

    if (m.status === "SETTLED") {
      settledMatchCount++;
    }

    // Sort players to create a consistent pairing key
    const pairing = [m.playerA, m.playerB].sort().join(" vs ");
    pairings.add(pairing);
  }

  const playerCount = players.size;
  const uniqueMatchCount = pairings.size;

  // A group is expected to have 3 or 4 players
  // Matches for N players round robin is N * (N - 1) / 2
  const expectedMatchCount = playerCount > 0 ? (playerCount * (playerCount - 1)) / 2 : 0;

  // Calculate standings
  const groupStandings = calculateGroupStandings(groupMatches);
  const standings = groupStandings.length > 0
    ? groupStandings[0].standings.map(s => s.playerName)
    : [];

  const top2Provisional = standings.slice(0, 2);

  const isComplete =
    (playerCount === 3 || playerCount === 4) &&
    uniqueMatchCount === expectedMatchCount &&
    settledMatchCount === expectedMatchCount;

  return {
    groupCode,
    playerCount,
    scheduledMatchCount: uniqueMatchCount,
    settledMatchCount,
    isComplete,
    isConfirmed: confirmationState?.confirmed ?? false,
    confirmationState,
    top2Provisional,
    standings
  };
}
