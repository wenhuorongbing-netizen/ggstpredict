"use client";

import { useEffect, useState, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { groupBracketMatches, WINNERS_ORDER, LOSERS_ORDER, GRAND_FINAL, GRAND_FINAL_RESET } from "@/lib/bracket-layout";
import AppLayout from "@/components/AppLayout";
import { Match } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import BracketMatchNode from "@/components/BracketMatchNode";
import { calculateGroupStandings, GroupStandings } from "@/lib/standings";

export default function BracketPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [stageFilter, setStageFilter] = useState<"GROUP" | "BRACKET">("GROUP");

  const [groupStandings, setGroupStandings] = useState<any[]>([]);

  const fetchMatches = async () => {
    try {
      let currentTournamentId = "";
      try {
        const resT = await fetch("/api/tournaments");
        if (resT.ok) {
          const tData = await resT.json();
          if (tData.tournament?.id) currentTournamentId = tData.tournament.id;
        }
      } catch (err) {}

      const res = await fetch("/api/matches");
      if (res.ok) {
        const data = await res.json();
        const scopedData = currentTournamentId ? data.filter((m: any) => m.tournamentId === currentTournamentId) : data;
        setMatches(scopedData);
      }

      // Fetch confirmed group standings from the new API
      const url = currentTournamentId ? `/api/groups/standings?tournamentId=${currentTournamentId}` : `/api/groups/standings`;
      const gsRes = await fetch(url);
      if (gsRes.ok) {
        const gsData = await gsRes.json();
        setGroupStandings(gsData);
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

  const bracketMatches = useMemo(() => {
    return matches.filter((m: Match) => m.stageType === "BRACKET");
  }, [matches]);

const { winnersMatches, losersMatches, grandFinalMatch, resetMatch, otherMatches } = useMemo(() => {
    return groupBracketMatches(bracketMatches);
  }, [bracketMatches]);

  const groupMatchesByExactOrder = (matchList: any[], orderTemplate: string[]) => {
    const groups: Record<string, any[]> = {};
    orderTemplate.forEach(roundName => groups[roundName] = []);
    matchList.forEach(m => {
       if (groups[m.roundName]) {
          groups[m.roundName].push(m);
       } else {
          groups[m.roundName] = [m];
       }
    });
    return orderTemplate.map(roundName => ({
       roundName,
       matches: groups[roundName] || []
    })).filter(g => g.matches.length > 0);
  };

  const winnersRounds = groupMatchesByExactOrder(winnersMatches, WINNERS_ORDER);
  const losersRounds = groupMatchesByExactOrder(losersMatches, LOSERS_ORDER);

  if (grandFinalMatch) {
     winnersRounds.push({ roundName: GRAND_FINAL, matches: [grandFinalMatch] });
  }
  if (resetMatch) {
     winnersRounds.push({ roundName: GRAND_FINAL_RESET, matches: [resetMatch] });
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        {/* Stage Filter Tabs */}
        <div className="flex justify-center mb-8 relative z-10">
          <div className="flex gap-2 bg-[#000000] p-1.5 border-2 border-neutral-800 shadow-[4px_4px_0px_rgba(38,38,38,1)] transform -skew-x-2">
            <button
              onClick={() => setStageFilter("GROUP")}
              className={`px-8 py-3 font-bold tracking-widest transition-all focus-visible:outline-none flex items-center gap-2 ${
                stageFilter === "GROUP"
                  ? "bg-green-600 text-white shadow-[2px_2px_0px_rgba(22,163,74,0.5)] transform translate-x-[1px] translate-y-[1px]"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
              style={{ fontSize: "1.1rem" }}
            >
              🟢 小组赛 (Group Stage)
            </button>
            <button
              onClick={() => setStageFilter("BRACKET")}
              className={`px-8 py-3 font-bold tracking-widest transition-all focus-visible:outline-none flex items-center gap-2 ${
                stageFilter === "BRACKET"
                  ? "bg-red-600 text-white shadow-[2px_2px_0px_rgba(239,68,68,0.5)] transform translate-x-[1px] translate-y-[1px]"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
              style={{ fontSize: "1.1rem" }}
            >
              🔴 淘汰赛 (Knockout Stage)
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6 px-4">
          <h2 className="text-4xl font-black text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)] transform skew-x-2" style={{ fontFamily: "var(--font-bebas)" }}>
            {stageFilter === "GROUP" ? "GROUP STAGE" : "KNOCKOUT STAGE"}
          </h2>
          <button
            onClick={() => { setIsRefreshing(true); fetchMatches(); }}
            className={`ggst-button px-4 py-2 border-neutral-600 text-sm transform -skew-x-6 ${isRefreshing ? 'opacity-50' : ''}`}
            disabled={isRefreshing}
          >
            {isRefreshing ? "SYNCING..." : "RELOAD"}
          </button>
        </div>

        {isInitialLoad ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-yellow-500 font-bold font-mono animate-pulse text-xl">LOADING STAGE DATA...</div>
          </div>
        ) : stageFilter === "GROUP" ? (
          <div className="flex flex-col gap-12 w-full px-4">
            {groupStandings.length === 0 ? (
              <div className="text-center py-20 bg-black/50 border-2 border-neutral-800 border-dashed transform -skew-x-2">
                <p className="text-neutral-500 font-bold text-2xl tracking-widest">等待小组赛数据 (NO GROUP MATCHES FOUND)</p>
              </div>
            ) : (
              groupStandings.map((group) => {
                const s = group.status;
                const statusLabel = s?.isConfirmed ? "已确认 (CONFIRMED)" : (s?.isComplete ? "可确认 (READY TO CONFIRM)" : "进行中 (IN PROGRESS)");
                const statusColor = s?.isConfirmed ? "text-green-500 border-green-500" : (s?.isComplete ? "text-yellow-500 border-yellow-500" : "text-neutral-500 border-neutral-500");

                return (
                <div key={group.groupName} className="w-full relative">
                  <div className="flex justify-between items-end mb-4 border-b-4 border-neutral-800 pb-2">
                    <h3 className="text-3xl font-black text-white transform skew-x-2 tracking-widest uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                      [ {group.groupName} ]
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-bold text-neutral-400 font-mono">
                        {s?.settledMatchCount || 0}/{s?.scheduledMatchCount || 0} MATCHES SETTLED
                      </div>
                      <div className={`px-3 py-1 text-sm font-bold tracking-widest border-2 transform -skew-x-6 ${statusColor}`}>
                        {statusLabel}
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-900 border-2 border-neutral-700/50 clip-chamfer overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-sm whitespace-nowrap">
                        <thead className="bg-neutral-950 border-b-2 border-neutral-800 text-neutral-400">
                          <tr>
                            <th className="p-4 font-bold tracking-widest">排名 (RANK)</th>
                            <th className="p-4 font-bold tracking-widest w-1/3">选手 (PLAYER)</th>
                            <th className="p-4 font-bold tracking-widest text-center">比赛胜负 (MATCH W-L)</th>
                            <th className="p-4 font-bold tracking-widest text-center">小局胜负 (GAME W-L)</th>
                            <th className="p-4 font-bold tracking-widest text-center">净胜分 (DIFF)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/50">
                          {group.standings.map((standing: any, index: number) => {
                            const isAdvanced = index < 2; // Typically top 2 advance
                            const isProvisional = isAdvanced && !group.status?.isConfirmed;
                            const isQualified = isAdvanced && group.status?.isConfirmed;

                            return (
                              <tr key={standing.playerName} className={`transition-colors hover:bg-neutral-800/30 ${isAdvanced ? (isQualified ? 'bg-green-950/10' : 'bg-yellow-950/10') : ''}`}>
                                <td className="p-4">
                                  <span className={`font-black text-xl ${isAdvanced ? (isQualified ? 'text-green-500' : 'text-yellow-500') : 'text-neutral-500'}`} style={{ fontFamily: "var(--font-bebas)" }}>
                                    #{index + 1}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-white text-lg">{standing.playerName}</span>
                                    {isQualified && <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 border border-green-700/50 tracking-widest uppercase font-sans font-bold">晋级 QUALIFIED</span>}
                                    {isProvisional && <span className="text-[10px] bg-yellow-900/50 text-yellow-400 px-2 py-0.5 border border-yellow-700/50 tracking-widest uppercase font-sans font-bold">暂定 PROVISIONAL</span>}
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <span className="text-white font-bold">{standing.matchWins}</span>
                                  <span className="text-neutral-600 mx-1">-</span>
                                  <span className="text-neutral-400">{standing.matchLosses}</span>
                                </td>
                                <td className="p-4 text-center">
                                  <span className="text-blue-400 font-bold">{standing.gameWins}</span>
                                  <span className="text-neutral-600 mx-1">-</span>
                                  <span className="text-red-400">{standing.gameLosses}</span>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`font-bold ${standing.gameDiff > 0 ? 'text-green-500' : standing.gameDiff < 0 ? 'text-red-500' : 'text-neutral-500'}`}>
                                    {standing.gameDiff > 0 ? '+' : ''}{standing.gameDiff}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>
        ) : bracketMatches.length === 0 ? (
          <div className="text-center py-20 bg-black/50 border-2 border-neutral-800 border-dashed mx-4 transform -skew-x-2">
             <p className="text-neutral-500 font-bold text-2xl tracking-widest">等待淘汰赛数据 (NO BRACKET MATCHES FOUND)</p>
          </div>
        ) : (
          <>
            {/* Knockout Stage Summary Strip */}
            <div className="bg-neutral-900 border-y-4 border-red-600 p-4 mb-8 mx-4 transform -skew-x-2 shadow-[4px_4px_0px_rgba(239,68,68,0.3)] flex flex-wrap justify-between items-center gap-4">
               <div className="flex flex-col">
                  <span className="text-neutral-400 font-bold tracking-widest text-xs uppercase">Event Status</span>
                  <span className="text-white font-black text-2xl tracking-widest drop-shadow-[1px_1px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                    8-PLAYER DOUBLE ELIMINATION
                  </span>
               </div>
               <div className="flex gap-6 sm:gap-12 text-center">
                  <div className="flex flex-col">
                     <span className="text-neutral-400 font-bold tracking-widest text-[10px] uppercase">Progress</span>
                     <span className="text-blue-400 font-mono font-bold text-xl">
                       {bracketMatches.filter(m => m.status === 'SETTLED').length} / {bracketMatches.length}
                     </span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-neutral-400 font-bold tracking-widest text-[10px] uppercase">Open / Locked</span>
                     <span className="text-yellow-500 font-mono font-bold text-xl">
                       {bracketMatches.filter(m => m.status === 'OPEN').length} <span className="text-neutral-600">|</span> {bracketMatches.filter(m => m.status === 'LOCKED').length}
                     </span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-neutral-400 font-bold tracking-widest text-[10px] uppercase">Current Focus</span>
                     <span className="text-white font-black text-xl tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
                       {
                         bracketMatches.some(m => (m.roundName === GRAND_FINAL || m.roundName === GRAND_FINAL_RESET) && m.status === 'OPEN') ? 'GRAND FINAL' :
                         bracketMatches.some(m => m.status === 'OPEN' && WINNERS_ORDER.includes(m.roundName || '')) ? 'WINNERS' :
                         bracketMatches.some(m => m.status === 'OPEN' && LOSERS_ORDER.includes(m.roundName || '')) ? 'LOSERS' :
                         bracketMatches.every(m => m.status === 'SETTLED') ? 'CHAMPION CROWNED' : 'WAITING'
                       }
                     </span>
                  </div>
               </div>
            </div>

            <div className="flex flex-col gap-12 overflow-x-auto whitespace-normal break-words sm:whitespace-nowrap bg-neutral-950 p-4 sm:p-10 relative shadow-[inset_0_0_100px_rgba(0,0,0,1)] border-4 border-neutral-900 mx-2 sm:mx-4 custom-scrollbar pb-24 min-h-[600px]">

              {/* Winners Bracket Row */}
              {winnersRounds.length > 0 && (
                <div className="flex gap-8 sm:gap-12 relative w-fit min-w-full">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-neutral-800 font-black tracking-widest text-4xl select-none pointer-events-none opacity-50 z-0" style={{ fontFamily: "var(--font-bebas)" }}>
                    WINNERS
                  </div>
                  {winnersRounds.map((round, colIndex) => (
                    <div key={round.roundName} className="flex flex-col flex-shrink-0 relative z-10 w-full sm:w-72 md:w-80 pt-8">
                      {/* Visual connection spacer line to next round */}
                      {colIndex < winnersRounds.length - 1 && (
                         <svg className="absolute -right-12 top-12 bottom-0 w-12 h-full pointer-events-none" style={{ zIndex: -1 }}>
                            <path d="M 0 50 C 24 50, 24 100, 48 100" fill="transparent" stroke="rgba(220, 38, 38, 0.3)" strokeWidth="2" vectorEffect="non-scaling-stroke" className="path-connector" />
                         </svg>
                      )}

                      <h3 className="absolute top-0 left-0 right-0 text-red-500 font-bold text-sm tracking-widest text-center bg-red-950/30 py-1 mb-2 border border-red-900/50" style={{ fontFamily: "var(--font-bebas)" }}>
                        {round.roundName}
                      </h3>

                      <div className="flex flex-col gap-6 justify-around h-full py-4">
                        {round.matches.map(m => (
                          <div key={m.id} className="relative z-10 bracket-node">
                            <BracketMatchNode match={m as Match} isWinnersBracket={true} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Losers Bracket Row */}
              {losersRounds.length > 0 && (
                <div className="flex gap-8 sm:gap-12 relative mt-16 border-t-2 border-dashed border-neutral-800/50 pt-16 w-fit min-w-full">
                  <div className="absolute -left-2 top-[60%] -translate-y-1/2 -rotate-90 text-neutral-800 font-black tracking-widest text-4xl select-none pointer-events-none opacity-50 z-0" style={{ fontFamily: "var(--font-bebas)" }}>
                    LOSERS
                  </div>
                  {losersRounds.map((round, colIndex) => (
                    <div key={round.roundName} className="flex flex-col flex-shrink-0 relative z-10 w-full sm:w-72 md:w-80 pt-8">
                      {colIndex < losersRounds.length - 1 && (
                         <svg className="absolute -right-12 top-12 bottom-0 w-12 h-full pointer-events-none" style={{ zIndex: -1 }}>
                            <path d="M 0 50 C 24 50, 24 100, 48 100" fill="transparent" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" vectorEffect="non-scaling-stroke" className="path-connector" />
                         </svg>
                      )}
                      <h3 className="absolute top-0 left-0 right-0 text-blue-500 font-bold text-sm tracking-widest text-center bg-blue-950/30 py-1 mb-2 border border-blue-900/50" style={{ fontFamily: "var(--font-bebas)" }}>
                        {round.roundName}
                      </h3>
                      <div className="flex flex-col gap-6 justify-around h-full py-4">
                        {round.matches.map(m => (
                          <div key={m.id} className="relative z-10 bracket-node">
                            <BracketMatchNode match={m as Match} isWinnersBracket={false} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Other Bracket Row (If any unclassified bracket matches exist) */}
              {otherMatches.length > 0 && (
                <div className="flex gap-8 sm:gap-12 relative mt-12 border-t border-neutral-800/50 pt-12">
                   <div className="flex flex-col gap-6 flex-shrink-0 relative w-full sm:w-72 md:w-80 pt-8">
                     <h3 className="absolute top-0 left-0 right-0 text-neutral-500 font-bold text-sm tracking-widest text-center bg-neutral-900/50 py-1 mb-2 border border-neutral-800" style={{ fontFamily: "var(--font-bebas)" }}>
                       OTHER MATCHES
                     </h3>
                     <div className="flex flex-col gap-6 justify-around h-full">
                       {otherMatches.map(m => (
                         <div key={m.id} className="relative z-10">
                           <BracketMatchNode match={m as Match} isWinnersBracket={true} />
                         </div>
                       ))}
                     </div>
                   </div>
                </div>
              )}

            </div>
          </>
        )}

      </AppLayout>
    </ProtectedRoute>
  );
}
