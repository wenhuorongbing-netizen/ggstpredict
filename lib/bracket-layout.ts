// Fixed template for 8-player double elimination
export const WINNERS_ORDER = [
  "Winners Quarter-Final 1",
  "Winners Quarter-Final 2",
  "Winners Quarter-Final 3",
  "Winners Quarter-Final 4",
  "Winners Semi-Final 1",
  "Winners Semi-Final 2",
  "Winners Final"
];

export const LOSERS_ORDER = [
  "Losers Round 1 (1)",
  "Losers Round 1 (2)",
  "Losers Quarter-Final 1",
  "Losers Quarter-Final 2",
  "Losers Semi-Final",
  "Losers Final"
];

export const GRAND_FINAL = "Grand Final";
export const GRAND_FINAL_RESET = "Grand Final Reset";

export interface BracketMatch {
  id: string;
  roundName?: string | null;
  playerA: string;
  playerB: string;
  status: string;
  [key: string]: any;
}

export interface BracketLayout {
  winnersMatches: BracketMatch[];
  losersMatches: BracketMatch[];
  grandFinalMatch: BracketMatch | null;
  resetMatch: BracketMatch | null;
  otherMatches: BracketMatch[];
}

export function groupBracketMatches(matches: BracketMatch[]): BracketLayout {
  const winnersMatches: BracketMatch[] = [];
  const losersMatches: BracketMatch[] = [];
  let grandFinalMatch: BracketMatch | null = null;
  let resetMatch: BracketMatch | null = null;
  const otherMatches: BracketMatch[] = [];

  // Temporary storage to sort later
  const winnersMap = new Map<string, BracketMatch>();
  const losersMap = new Map<string, BracketMatch>();

  for (const match of matches) {
    if (!match.roundName) {
      otherMatches.push(match);
      continue;
    }

    const rn = match.roundName;

    if (WINNERS_ORDER.includes(rn)) {
      winnersMap.set(rn, match);
    } else if (LOSERS_ORDER.includes(rn)) {
      losersMap.set(rn, match);
    } else if (rn === GRAND_FINAL) {
      grandFinalMatch = match;
    } else if (rn === GRAND_FINAL_RESET) {
      // Logic for hiding Grand Final Reset
      // Only display if status is not LOCKED or if either player is not [ TBD ]
      const isHidden = match.status === "LOCKED" && match.playerA === "[ TBD ]" && match.playerB === "[ TBD ]";
      if (!isHidden) {
        resetMatch = match;
      }
    } else {
      otherMatches.push(match);
    }
  }

  // Populate arrays based on strictly defined order constants
  WINNERS_ORDER.forEach(round => {
    const match = winnersMap.get(round);
    if (match) winnersMatches.push(match);
  });

  LOSERS_ORDER.forEach(round => {
    const match = losersMap.get(round);
    if (match) losersMatches.push(match);
  });

  // Additional check to capture matches mapped to WINNERS_ORDER/LOSERS_ORDER but with duplicated names
  // (though in a standard 8-player bracket, they are uniquely named).
  // Any extra matches with the exact same roundName would technically be ignored in the map approach.
  // To be safe, if there are multiple matches with the same valid round name, push the extras to 'otherMatches'.
  const processedIds = new Set([
    ...winnersMatches.map(m => m.id),
    ...losersMatches.map(m => m.id),
    ...(grandFinalMatch ? [grandFinalMatch.id] : []),
    ...(resetMatch ? [resetMatch.id] : []),
    ...otherMatches.map(m => m.id)
  ]);

  for (const match of matches) {
    if (!processedIds.has(match.id)) {
      // Specifically target "Grand Final Reset" that is intentionally hidden
      if (match.roundName === GRAND_FINAL_RESET && match.status === "LOCKED" && match.playerA === "[ TBD ]" && match.playerB === "[ TBD ]") {
         // Do nothing, keep it completely out of render model.
      } else {
         otherMatches.push(match);
      }
    }
  }

  return {
    winnersMatches,
    losersMatches,
    grandFinalMatch,
    resetMatch,
    otherMatches
  };
}
