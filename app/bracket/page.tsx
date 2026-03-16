"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import PlayerAvatar from "@/components/PlayerAvatar";
import BracketMatchNode from "@/components/BracketMatchNode";

interface Match {
  id: string;
  playerA: string;
  playerB: string;
  charA?: string | null;
  charB?: string | null;
  status: string;
  winner?: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
  stageType?: string | null;
  groupId?: string | null;
  roundName?: string | null;
  nextWinnerMatchId?: string | null;
  nextLoserMatchId?: string | null;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  matches: Match[];
}

interface PlayerStanding {
  name: string;
  points: number;
}

export default function BracketPage() {
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTournament();
  }, []);

  const fetchTournament = async () => {
    try {
      const res = await fetch("/api/tournaments");
      if (res.ok) {
        const data = await res.json();
        setTournament(data.tournament);
      }
    } catch (err) {
      console.error("Failed to fetch tournament", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate Group Standings
  // In GGST Round Robins, advancement isn't just Match W/L; it's based on Round Points.
  // Add match.scoreA to Player A's total points, and match.scoreB to Player B's total points.
  // Sort leaderboard strictly descending by Total Points.
  const getGroupStandings = () => {
    if (!tournament) return {};

    const standings: Record<string, Record<string, PlayerStanding>> = {};

    tournament.matches.forEach((m) => {
      if (m.stageType !== "GROUP" || !m.groupId) return;

      const group = m.groupId;
      if (!standings[group]) standings[group] = {};

      // Initialize players if not exist
      if (!standings[group][m.playerA]) standings[group][m.playerA] = { name: m.playerA, points: 0 };
      if (!standings[group][m.playerB]) standings[group][m.playerB] = { name: m.playerB, points: 0 };

      if (m.status === "SETTLED") {
        if (typeof m.scoreA === 'number') {
          standings[group][m.playerA].points += m.scoreA;
        } else if (m.winner === 'A') {
          standings[group][m.playerA].points += 1;
        }

        if (typeof m.scoreB === 'number') {
          standings[group][m.playerB].points += m.scoreB;
        } else if (m.winner === 'B') {
          standings[group][m.playerB].points += 1;
        }
      }
    });

    // Convert to sorted arrays: sort leaderboard strictly descending by these Total Points
    const sortedStandings: Record<string, PlayerStanding[]> = {};
    for (const group in standings) {
      sortedStandings[group] = Object.values(standings[group]).sort((a, b) => b.points - a.points);
    }

    return sortedStandings;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-red-500 animate-spin text-4xl">⚙</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex flex-col items-center justify-center min-h-[60vh] relative z-10 transform -skew-x-2">
            <h1 className="text-6xl text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)] mb-4" style={{ fontFamily: "var(--font-bebas)" }}>NO ACTIVE TOURNAMENT</h1>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const groupStandings = getGroupStandings();
  const groups = Object.keys(groupStandings).sort();

  // Filter and group BRACKET matches
  const bracketMatches = tournament.matches.filter(m => m.stageType === "BRACKET");

  // Winners bracket rounds: basically any round that is NOT "Losers" and NOT "LF"
  const isWinnersRound = (rn: string) => !rn.toLowerCase().includes("loser") && !rn.toLowerCase().includes("lf");
  const isLosersRound = (rn: string) => rn.toLowerCase().includes("loser") || rn.toLowerCase().includes("lf");
  const isGrandFinals = (rn: string) => (rn.toLowerCase().includes("grand") || rn.toLowerCase().includes("gf")) && !rn.toLowerCase().includes("reset");
  const isGrandFinalReset = (rn: string) => rn.toLowerCase().includes("grand final reset") || rn.toLowerCase().includes("gf reset");

  const winnersMatches = bracketMatches.filter(m => m.roundName && isWinnersRound(m.roundName) && !isGrandFinals(m.roundName) && !isGrandFinalReset(m.roundName));
  const losersMatches = bracketMatches.filter(m => m.roundName && isLosersRound(m.roundName));
  const grandFinals = bracketMatches.filter(m => m.roundName && isGrandFinals(m.roundName));
  const grandFinalsReset = bracketMatches.filter(m => m.roundName && isGrandFinalReset(m.roundName));

  const groupByRound = (matches: Match[]) => {
    const grouped: Record<string, Match[]> = {};
    matches.forEach(m => {
      const rn = m.roundName || "Unassigned";
      if (!grouped[rn]) grouped[rn] = [];
      grouped[rn].push(m);
    });
    return grouped;
  };

  const winnersGrouped = groupByRound(winnersMatches);
  const losersGrouped = groupByRound(losersMatches);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="relative z-10 p-4 sm:p-8 w-full h-full">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 transform -skew-x-2 bg-[#1a1a1a] border border-neutral-800 p-4 max-w-7xl mx-auto">
            <div className="transform skew-x-2">
              <h1 className="text-4xl font-black text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                {tournament.name.toUpperCase()}
              </h1>
              <p className="text-red-500 text-sm tracking-widest font-bold uppercase">{tournament.status.replace("_", " ")}</p>
            </div>
          </div>

          {/* Group Stage Dashboard */}
          {tournament.status === "GROUP_STAGE" && groups.length > 0 ? (
            <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {groups.map((group) => (
                <motion.div
                  key={group}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
                >
                  {/* Standings Table */}
                  <div className="bg-black/80 border-2 border-neutral-700 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] transform -skew-x-2 relative">
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-600 pointer-events-none z-20"></div>
                    <div className="bg-neutral-900 p-4 border-b-2 border-neutral-800 flex justify-between items-center">
                      <h2 className="text-3xl font-black text-white tracking-widest transform skew-x-2 drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                        GROUP {group}
                      </h2>
                    </div>
                    <div className="p-1 transform skew-x-2">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-red-950/30 text-red-500 border-b border-red-900 font-bold tracking-widest text-sm" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}>
                            <th className="p-3">FIGHTER</th>
                            <th className="p-3 text-center w-32">POINTS (小分)</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-sm">
                          {groupStandings[group].map((player, idx) => {
                            // Find a match involving this player to get their character (optional)
                            const playerMatch = tournament.matches.find(m => m.playerA === player.name || m.playerB === player.name);
                            const charName = playerMatch ? (playerMatch.playerA === player.name ? playerMatch.charA : playerMatch.charB) : null;

                            return (
                              <tr key={player.name} className={`border-b border-neutral-800 ${idx === 0 ? 'bg-yellow-900/10 text-white' : 'text-neutral-300 hover:bg-neutral-900/50'}`}>
                                <td className="p-3 font-bold flex items-center gap-3">
                                  {idx === 0 && <span className="text-yellow-500 text-lg">👑</span>}
                                  <div className="w-10 h-10 flex-shrink-0">
                                    <PlayerAvatar
                                      playerName={player.name}
                                      charName={charName || ""}
                                      playerType="A" // Just to give it a border
                                    />
                                  </div>
                                  <span className="truncate">{player.name}</span>
                                </td>
                                <td className="p-3 text-center text-yellow-500 font-black">{player.points}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Group Matches List */}
                  <div className="bg-neutral-900/40 border border-neutral-800 p-4 transform -skew-x-2">
                    <h3 className="text-neutral-500 font-bold text-sm tracking-widest mb-3 transform skew-x-2 uppercase" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}>Group Matches</h3>
                    <div className="space-y-2 transform skew-x-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-700">
                      {tournament.matches.filter(m => m.groupId === group).map(m => (
                        <div key={m.id} className="flex justify-between items-center bg-black/50 p-2 border-l-2 border-neutral-700 text-xs font-mono">
                          <div className="flex gap-2 items-center flex-1">
                            <span className={m.winner === 'A' ? 'text-yellow-500 font-bold' : 'text-neutral-300'}>{m.playerA}</span>
                            <span className="text-neutral-600 text-[10px]">vs</span>
                            <span className={m.winner === 'B' ? 'text-yellow-500 font-bold' : 'text-neutral-300'}>{m.playerB}</span>
                          </div>
                          <div className="text-[10px] px-2 py-1 bg-neutral-900">
                            {m.status === 'SETTLED' ? 'SLASH!' : m.status === 'OPEN' ? 'LET\'S ROCK' : m.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </motion.div>
              ))}
            </div>
            </div>
          ) : tournament.status === "BRACKET" && bracketMatches.length > 0 ? (
            <div className="w-full overflow-x-auto whitespace-nowrap bg-neutral-950 p-10 custom-scrollbar relative">

              {/* WINNERS BRACKET */}
              <div className="mb-16">
                <h2 className="text-2xl font-black text-yellow-500 tracking-widest drop-shadow-[2px_2px_0px_rgba(234,179,8,0.5)] mb-6 flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)" }}>
                  <span className="animate-pulse">●</span> WINNERS BRACKET
                </h2>
                <div className="flex items-stretch gap-12">
                  {Object.entries(winnersGrouped).map(([roundName, matches], colIndex, arr) => (
                    <div key={roundName} className="flex flex-col relative">
                      <div className="text-neutral-500 font-bold tracking-widest text-sm text-center mb-4 h-6">{roundName}</div>
                      <div className="flex flex-col justify-around flex-1 relative">
                        {matches.map(m => (
                          <div key={m.id} className="relative py-2 z-10">
                            <BracketMatchNode match={m} />
                          </div>
                        ))}
                        {/* CSS Connector line to next round */}
                        {colIndex < arr.length - 1 && matches.map((_, i) => {
                          if (i % 2 === 0 && i + 1 < matches.length) {
                            return (
                              <div
                                key={i}
                                className="absolute -right-6 w-6 border-r-2 border-y-2 border-neutral-700/50 pointer-events-none z-0"
                                style={{
                                  top: `calc(${((i + 0.5) / matches.length) * 100}%)`,
                                  bottom: `calc(${100 - (((i + 1.5) / matches.length) * 100)}%)`
                                }}
                              >
                                <div className="absolute top-1/2 -right-6 w-6 border-t-2 border-neutral-700/50"></div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  ))}

                  {/* GRAND FINALS */}
                  {grandFinals.length > 0 && (
                    <div className="flex flex-col relative ml-12 pl-12 border-l-4 border-yellow-500/50">
                      <div className="text-yellow-500 font-bold tracking-widest text-sm text-center mb-4 h-6">GRAND FINALS</div>
                      <div className="flex flex-col justify-around flex-1 relative">
                        {grandFinals.map(m => (
                          <div key={m.id} className="relative py-2 z-10">
                            <div className="absolute -left-12 top-1/2 w-12 border-t-2 border-yellow-500/50"></div>
                            <BracketMatchNode match={m} />
                          </div>
                        ))}
                        {/* Connector if reset exists */}
                        {grandFinalsReset.length > 0 && (
                           <div className="absolute top-1/2 -right-12 w-12 border-t-2 border-red-500/50 pointer-events-none z-0"></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* GRAND FINALS RESET */}
                  {grandFinalsReset.length > 0 && (
                    <div className="flex flex-col relative ml-12">
                      <div className="text-red-500 font-bold tracking-widest text-sm text-center mb-4 h-6 animate-pulse">BRACKET RESET!</div>
                      <div className="flex flex-col justify-around flex-1 relative">
                        {grandFinalsReset.map(m => (
                          <div key={m.id} className="relative py-2 z-10">
                            <BracketMatchNode match={m} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DIVIDER */}
              <div className="w-full h-1 bg-gradient-to-r from-red-900/50 via-red-500/50 to-red-900/50 my-16 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>

              {/* LOSERS BRACKET */}
              <div>
                <h2 className="text-2xl font-black text-red-500 tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,0.5)] mb-6 flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)" }}>
                  <span className="animate-pulse">●</span> LOSERS BRACKET
                </h2>
                <div className="flex items-stretch gap-12">
                  {Object.entries(losersGrouped).map(([roundName, matches], colIndex, arr) => (
                    <div key={roundName} className="flex flex-col relative">
                      <div className="text-neutral-500 font-bold tracking-widest text-sm text-center mb-4 h-6">{roundName}</div>
                      <div className="flex flex-col justify-around flex-1 relative">
                        {matches.map(m => (
                          <div key={m.id} className="relative py-2 z-10">
                            <BracketMatchNode match={m} />
                          </div>
                        ))}
                        {/* CSS Connector */}
                        {colIndex < arr.length - 1 && matches.map((_, i) => {
                          if (i % 2 === 0 && i + 1 < matches.length) {
                            return (
                              <div
                                key={i}
                                className="absolute -right-6 w-6 border-r-2 border-y-2 border-neutral-700/50 pointer-events-none z-0"
                                style={{
                                  top: `calc(${((i + 0.5) / matches.length) * 100}%)`,
                                  bottom: `calc(${100 - (((i + 1.5) / matches.length) * 100)}%)`
                                }}
                              >
                                <div className="absolute top-1/2 -right-6 w-6 border-t-2 border-neutral-700/50"></div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-20 text-neutral-500 font-bold text-2xl tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
              STAY TUNED FOR TOURNAMENT DATA
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
