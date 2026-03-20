import { Match } from "@prisma/client";
import { groupBracketMatches, BracketLayout, WINNERS_ORDER, LOSERS_ORDER, GRAND_FINAL, GRAND_FINAL_RESET } from "./bracket-layout";

export interface BracketSummary {
  stage: string;
  groupsConfirmed: number;
  extraSettled: number;
  knockoutSettled: number;
  knockoutTotal: number;
  currentFocus: string;
}

export interface FinalsDisplayModel {
  extraMatches: Match[];
  knockoutLayout: BracketLayout;
  summary: BracketSummary;
}

// Helper to generate a dummy match for display purposes
function createPlaceholderMatch(id: string, roundName: string, playerA: string, playerB: string): Match {
  return {
    id,
    tournamentId: "placeholder",
    stageType: "BRACKET",
    groupId: null,
    groupName: null,
    roundName,
    playerA,
    playerB,
    scoreA: null,
    scoreB: null,
    charA: null,
    charB: null,
    winner: null,
    status: "LOCKED",
    createdAt: new Date(),
    updatedAt: new Date(),
    lockAt: null,
    nextWinnerMatchId: null,
    nextLoserMatchId: null,
    poolInjectA: 0,
    poolInjectB: 0
  } as unknown as Match;
}

export function generateFinalsDisplay(matches: Match[], groupStandings: any[]): FinalsDisplayModel {
  // 1. Analyze Group Standings
  let groupsConfirmed = 0;
  const groupWinners: Record<string, string> = { A: "Winner of Group A", B: "Winner of Group B", C: "Winner of Group C", D: "Winner of Group D" };
  const groupRunnersUp: Record<string, string> = { A: "Runner-up Group A", B: "Runner-up Group B", C: "Runner-up Group C", D: "Runner-up Group D" };

  for (const group of groupStandings) {
    const isConfirmed = group.status?.isConfirmed;
    if (isConfirmed) {
      groupsConfirmed++;
      if (group.standings && group.standings.length >= 2) {
        groupWinners[group.groupName] = group.standings[0].playerName;
        groupRunnersUp[group.groupName] = group.standings[1].playerName;
      }
    }
  }

  // 2. Extra Stage Matches (E1: A2 vs B2, E2: C2 vs D2)
  const realExtraMatches = matches.filter(m => m.stageType === "EXTRA"); // Assuming they might be tagged EXTRA, or just find them by roundName if they exist.
  // Actually, standard system might just use roundName or not have them at all yet. We'll use roundName "Extra Match 1" and "Extra Match 2"
  let matchE1 = matches.find(m => m.roundName === "Extra Match 1");
  let matchE2 = matches.find(m => m.roundName === "Extra Match 2");

  if (!matchE1) {
    matchE1 = createPlaceholderMatch("E1", "Extra Match 1", groupRunnersUp["A"], groupRunnersUp["B"]);
  }
  if (!matchE2) {
    matchE2 = createPlaceholderMatch("E2", "Extra Match 2", groupRunnersUp["C"], groupRunnersUp["D"]);
  }

  const extraMatches = [matchE1, matchE2];
  const extraSettled = extraMatches.filter(m => m.status === "SETTLED").length;

  const winnerE1 = matchE1.status === "SETTLED" ? (matchE1.winner === "A" ? matchE1.playerA : matchE1.playerB) : "Winner of A2 vs B2";
  const winnerE2 = matchE2.status === "SETTLED" ? (matchE2.winner === "A" ? matchE2.playerA : matchE2.playerB) : "Winner of C2 vs D2";


  // 3. Knockout Stage Setup
  const bracketMatches = matches.filter(m => m.stageType === "BRACKET");

  let knockoutLayout: BracketLayout;

  // If there are any actual bracket matches generated, we use the real bracket entirely.
  // This prevents blending placeholder structural nodes with partially generated brackets.
  if (bracketMatches.length > 0) {
      knockoutLayout = groupBracketMatches(bracketMatches);
  } else {
      // Otherwise, generate the pure placeholder structural layout
      const placeholderBracketMatches: Match[] = [];
      const addPlaceholder = (roundName: string, id: string, playerA: string, playerB: string) => {
          placeholderBracketMatches.push(createPlaceholderMatch(id, roundName, playerA, playerB));
      }

      addPlaceholder("Winners Quarter-Final 1", "W_QF_1", groupWinners["A"], "Slot Pending");
      addPlaceholder("Winners Quarter-Final 2", "W_QF_2", groupWinners["D"], "Slot Pending");
      addPlaceholder("Winners Quarter-Final 3", "W_QF_3", groupWinners["B"], winnerE2); // C2 vs D2
      addPlaceholder("Winners Quarter-Final 4", "W_QF_4", groupWinners["C"], winnerE1); // A2 vs B2

      // Other Winners
      addPlaceholder("Winners Semi-Final 1", "W_SF_1", "Pending Slot", "Pending Slot");
      addPlaceholder("Winners Semi-Final 2", "W_SF_2", "Pending Slot", "Pending Slot");
      addPlaceholder("Winners Final", "W_F", "Pending Slot", "Pending Slot");

      // Losers
      addPlaceholder("Losers Round 1 (1)", "L_R1_1", "Pending Slot", "Pending Slot");
      addPlaceholder("Losers Round 1 (2)", "L_R1_2", "Pending Slot", "Pending Slot");
      addPlaceholder("Losers Quarter-Final 1", "L_QF_1", "Pending Slot", "Pending Slot");
      addPlaceholder("Losers Quarter-Final 2", "L_QF_2", "Pending Slot", "Pending Slot");
      addPlaceholder("Losers Semi-Final", "L_SF", "Pending Slot", "Pending Slot");
      addPlaceholder("Losers Final", "L_F", "Pending Slot", "Pending Slot");

      // Grand Final
      addPlaceholder("Grand Final", "GF", "Pending Slot", "Pending Slot");

      knockoutLayout = groupBracketMatches(placeholderBracketMatches);
  }


  // 4. Calculate Summary
  const knockoutSettled = bracketMatches.filter(m => m.status === "SETTLED").length;
  // Use a fixed total for a standard 8-player DE (14 matches without reset)
  const knockoutTotal = 14;

  let currentFocus = "Waiting for Group Results";
  if (groupsConfirmed === 4 && extraSettled < 2) {
    currentFocus = "Extra Stage Running";
  } else if (extraSettled === 2 && knockoutSettled < knockoutTotal) {
    currentFocus = "Knockout Live";
  } else if (knockoutSettled >= knockoutTotal) {
    currentFocus = "Tournament Complete";
  }

  let stage = "Group Stage";
  if (groupsConfirmed === 4) stage = "Extra Stage";
  if (extraSettled === 2) stage = "Knockout Stage";

  const summary: BracketSummary = {
    stage,
    groupsConfirmed,
    extraSettled,
    knockoutSettled,
    knockoutTotal,
    currentFocus
  };

  return {
    extraMatches,
    knockoutLayout,
    summary
  };
}
