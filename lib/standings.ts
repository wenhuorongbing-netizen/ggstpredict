export type MatchForStandings = any;

export type PlayerStanding = {
  playerName: string;
  matchWins: number;
  matchLosses: number;
  gameWins: number;
  gameLosses: number;
  gameDiff: number;
};

export type GroupStandings = {
  groupName: string;
  standings: PlayerStanding[];
  matches: MatchForStandings[];
};

export function calculateGroupStandings(matches: MatchForStandings[]): GroupStandings[] {
  const groupMatches = matches.filter((m: any) => m.stageType === "GROUP");
  const groupedMatches: Record<string, MatchForStandings[]> = {};

  for (const m of groupMatches) {
    const gName = m.groupName || m.groupId || "Unknown Group";
    if (!groupedMatches[gName]) {
      groupedMatches[gName] = [];
    }
    groupedMatches[gName].push(m);
  }

  const result: GroupStandings[] = [];

  for (const [groupName, gMatches] of Object.entries(groupedMatches)) {
    const playerStats: Record<string, PlayerStanding> = {};

    const initPlayer = (name: string) => {
      if (!playerStats[name]) {
        playerStats[name] = {
          playerName: name,
          matchWins: 0,
          matchLosses: 0,
          gameWins: 0,
          gameLosses: 0,
          gameDiff: 0,
        };
      }
    };

    for (const m of gMatches) {
      if (!m.playerA || !m.playerB) continue;

      initPlayer(m.playerA);
      initPlayer(m.playerB);

      if (m.status === "SETTLED") {
        if (m.winner === "A") {
          playerStats[m.playerA].matchWins += 1;
          playerStats[m.playerB].matchLosses += 1;
        } else if (m.winner === "B") {
          playerStats[m.playerB].matchWins += 1;
          playerStats[m.playerA].matchLosses += 1;
        }

        let sA = m.scoreA;
        let sB = m.scoreB;

        if (sA == null || sB == null) {
          sA = m.winner === "A" ? 1 : 0;
          sB = m.winner === "B" ? 1 : 0;
        }

        playerStats[m.playerA].gameWins += sA;
        playerStats[m.playerA].gameLosses += sB;

        playerStats[m.playerB].gameWins += sB;
        playerStats[m.playerB].gameLosses += sA;
      }
    }

    const standings = Object.values(playerStats);

    for (const p of standings) {
      p.gameDiff = p.gameWins - p.gameLosses;
    }

    // Sort: Match Wins desc -> Match Losses asc -> Game Diff desc -> Game Wins desc
    standings.sort((a, b) => {
      if (a.matchWins !== b.matchWins) return b.matchWins - a.matchWins;
      if (a.matchLosses !== b.matchLosses) return a.matchLosses - b.matchLosses;
      if (a.gameDiff !== b.gameDiff) return b.gameDiff - a.gameDiff;
      return b.gameWins - a.gameWins;
    });

    result.push({
      groupName,
      standings,
      matches: gMatches
    });
  }

  result.sort((a, b) => a.groupName.localeCompare(b.groupName));

  return result;
}
