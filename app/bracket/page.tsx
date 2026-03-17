"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { Match } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import BracketMatchNode from "@/components/BracketMatchNode";

export default function BracketPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      if (res.ok) {
        const data = await res.json();
        // Strict filter: only BRACKET stage matches
        setMatches(data.filter((m: Match) => m.stageType === "BRACKET"));
      }
    } catch (e) {
      console.error("Failed to fetch matches:", e);
    } finally {
      setIsInitialLoad(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(() => {
      fetchMatches();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Structural sorting: We need a way to group rounds.
  // Group logic: Winners / Losers, then by roundName.
  const winnersMatches = matches.filter(m => m.roundName && m.roundName.toLowerCase().includes("winner") || m.roundName?.toLowerCase().includes("grand"));
  const losersMatches = matches.filter(m => m.roundName && m.roundName.toLowerCase().includes("loser"));
  const otherMatches = matches.filter(m => !winnersMatches.includes(m) && !losersMatches.includes(m));

  // A very simple grouping by exact round name string.
  // In a real generic app, you'd parse round numbers and build an exact tree, but grouping vertically works visually for AWT style.
  const groupMatchesByRound = (matchList: Match[]) => {
    const groups: Record<string, Match[]> = {};
    matchList.forEach(m => {
      const r = m.roundName || "Unassigned";
      if (!groups[r]) groups[r] = [];
      groups[r].push(m);
    });
    // Convert to array of arrays. Since we don't have explicit round numbers, we rely on the creation time heuristic or just alphabetical.
    return Object.entries(groups).map(([roundName, roundMatches]) => ({
      roundName,
      matches: roundMatches.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
    })).sort((a, b) => {
        // Simple sorting for common AWT round names if possible
        const orderA = a.roundName.match(/\d+/) ? parseInt(a.roundName.match(/\d+/)![0]) : 99;
        const orderB = b.roundName.match(/\d+/) ? parseInt(b.roundName.match(/\d+/)![0]) : 99;
        if (a.roundName.toLowerCase().includes("quarter")) return -1;
        if (b.roundName.toLowerCase().includes("quarter")) return 1;
        if (a.roundName.toLowerCase().includes("semi")) return -1;
        if (b.roundName.toLowerCase().includes("semi")) return 1;
        if (a.roundName.toLowerCase().includes("final") && !a.roundName.toLowerCase().includes("grand")) return -1;
        if (b.roundName.toLowerCase().includes("final") && !b.roundName.toLowerCase().includes("grand")) return 1;
        if (a.roundName.toLowerCase().includes("grand")) return 1;
        if (b.roundName.toLowerCase().includes("grand")) return -1;

        return orderA - orderB;
    });
  };

  const winnersRounds = groupMatchesByRound(winnersMatches);
  const losersRounds = groupMatchesByRound(losersMatches);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="flex justify-between items-center mb-6 px-4">
          <h2 className="text-4xl font-black text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)] transform skew-x-2" style={{ fontFamily: "var(--font-bebas)" }}>
            KNOCKOUT STAGE
          </h2>
          <button
            onClick={() => { setIsRefreshing(true); fetchMatches(); }}
            className={`ggst-button px-4 py-2 border-neutral-600 text-sm transform -skew-x-6 ${isRefreshing ? 'opacity-50' : ''}`}
            disabled={isRefreshing}
          >
            {isRefreshing ? "SYNCING..." : "RELOAD BRACKET"}
          </button>
        </div>

        {isInitialLoad ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-yellow-500 font-bold font-mono animate-pulse text-xl">LOADING STAGE DATA...</div>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20 bg-black/50 border-2 border-neutral-800 border-dashed mx-4 transform -skew-x-2">
             <p className="text-neutral-500 font-bold text-2xl tracking-widest">等待淘汰赛数据 (NO BRACKET MATCHES FOUND)</p>
          </div>
        ) : (
          <div className="flex flex-col gap-12 overflow-x-auto whitespace-nowrap bg-neutral-950 p-10 relative shadow-[inset_0_0_100px_rgba(0,0,0,1)] border-4 border-neutral-900 mx-4 custom-scrollbar pb-24 min-h-[600px]">

            {/* Winners Bracket Row */}
            {winnersRounds.length > 0 && (
              <div className="flex gap-16 relative w-fit min-w-full">
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-neutral-800 font-black tracking-widest text-4xl select-none pointer-events-none opacity-50 z-0" style={{ fontFamily: "var(--font-bebas)" }}>
                  WINNERS
                </div>
                {winnersRounds.map((round, colIndex) => (
                  <div key={round.roundName} className="flex flex-col gap-8 flex-shrink-0 relative z-10 w-64 pt-8">
                    {/* Visual connection spacer line to next round */}
                    {colIndex < winnersRounds.length - 1 && (
                       <div className="absolute -right-16 top-16 bottom-16 w-16 border-r-2 border-y-2 border-red-900/30 rounded-r opacity-50 pointer-events-none"></div>
                    )}

                    <h3 className="absolute top-0 left-0 right-0 text-red-500 font-bold text-sm tracking-widest text-center bg-red-950/30 py-1 mb-2 border border-red-900/50" style={{ fontFamily: "var(--font-bebas)" }}>
                      {round.roundName}
                    </h3>

                    <div className="flex flex-col gap-6 justify-around h-full">
                      {round.matches.map(m => (
                        <div key={m.id} className="relative z-10">
                          <BracketMatchNode match={m} isWinnersBracket={true} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Losers Bracket Row */}
            {losersRounds.length > 0 && (
              <div className="flex gap-16 relative mt-16 border-t-2 border-dashed border-neutral-800/50 pt-16 w-fit min-w-full">
                <div className="absolute -left-2 top-[60%] -translate-y-1/2 -rotate-90 text-neutral-800 font-black tracking-widest text-4xl select-none pointer-events-none opacity-50 z-0" style={{ fontFamily: "var(--font-bebas)" }}>
                  LOSERS
                </div>
                {losersRounds.map((round, colIndex) => (
                  <div key={round.roundName} className="flex flex-col gap-6 flex-shrink-0 relative z-10 w-64 pt-8">
                    {colIndex < losersRounds.length - 1 && (
                       <div className="absolute -right-16 top-16 bottom-16 w-16 border-r-2 border-y-2 border-blue-900/30 rounded-r opacity-50 pointer-events-none"></div>
                    )}
                    <h3 className="absolute top-0 left-0 right-0 text-blue-500 font-bold text-sm tracking-widest text-center bg-blue-950/30 py-1 mb-2 border border-blue-900/50" style={{ fontFamily: "var(--font-bebas)" }}>
                      {round.roundName}
                    </h3>
                    <div className="flex flex-col gap-6 justify-around h-full">
                      {round.matches.map(m => (
                        <div key={m.id} className="relative z-10">
                          <BracketMatchNode match={m} isWinnersBracket={false} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Other Bracket Row (If any unclassified bracket matches exist) */}
            {otherMatches.length > 0 && (
              <div className="flex gap-16 relative mt-12 border-t border-neutral-800/50 pt-12">
                 <div className="flex flex-col gap-6 flex-shrink-0 relative w-64 pt-8">
                   <h3 className="absolute top-0 left-0 right-0 text-neutral-500 font-bold text-sm tracking-widest text-center bg-neutral-900/50 py-1 mb-2 border border-neutral-800" style={{ fontFamily: "var(--font-bebas)" }}>
                     OTHER MATCHES
                   </h3>
                   <div className="flex flex-col gap-6 justify-around h-full">
                     {otherMatches.map(m => (
                       <div key={m.id} className="relative z-10">
                         <BracketMatchNode match={m} isWinnersBracket={true} />
                       </div>
                     ))}
                   </div>
                 </div>
              </div>
            )}

          </div>
        )}

      </AppLayout>
    </ProtectedRoute>
  );
}
