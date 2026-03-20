export type Slot = "A" | "B";

export interface LinkTarget {
  matchId: string;
  slot: Slot;
}

export interface MatchLinks {
  winner?: LinkTarget;
  loser?: LinkTarget;
}

export interface TopologyMap {
  [matchId: string]: MatchLinks;
}

export interface MatchState {
  id: string;
  playerA: string;
  playerB: string;
  status: string;
}

export function calculateProgressionUpdate(
  topology: TopologyMap | null,
  sourceMatchId: string,
  advancingPlayer: string,
  type: "winner" | "loser",
  targetMatchState: MatchState | null
): any {
  if (!topology || !topology[sourceMatchId] || !topology[sourceMatchId][type]) {
    return null;
  }

  const link = topology[sourceMatchId][type]!;
  if (!targetMatchState || targetMatchState.id !== link.matchId) {
    return null; // Ensure we are evaluating the right target
  }

  const targetSlot = link.slot;
  const currentOccupant = targetSlot === "A" ? targetMatchState.playerA : targetMatchState.playerB;

  // Prevent overwriting someone else
  if (currentOccupant !== "[ TBD ]" && currentOccupant !== advancingPlayer) {
    throw new Error(`Progression Conflict: Target slot ${targetSlot} is already occupied by ${currentOccupant}`);
  }

  const updateData: any = {};
  if (targetSlot === "A") updateData.playerA = advancingPlayer;
  if (targetSlot === "B") updateData.playerB = advancingPlayer;

  // Determine if the target match is now fully populated
  const finalPlayerA = updateData.playerA || targetMatchState.playerA;
  const finalPlayerB = updateData.playerB || targetMatchState.playerB;

  if (finalPlayerA !== "[ TBD ]" && finalPlayerB !== "[ TBD ]") {
    updateData.status = "OPEN";
  }

  return updateData;
}
