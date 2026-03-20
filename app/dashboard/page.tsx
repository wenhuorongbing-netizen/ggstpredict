"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import confetti from "canvas-confetti";
import AppLayout from "@/components/AppLayout";
import PlayerAvatar from "@/components/PlayerAvatar";

interface Bet {
  id: string;
  userId: string;
  matchId: string;
  amount: number;
  choice: "A" | "B";
  comment?: string;
  user: {
    username: string;
  };
}

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
  groupName?: string | null;
  bets?: Bet[];
  poolA: number;
  poolB: number;
}

interface LeaderboardEntry {
  id: string;
  displayName: string;
  nameColor?: string;
  points: number;
}


function MatchCard({ match, userId, points, fdShields, fatalCounters, sysSettings, fetchUserPoints, fetchMatches, setError, setPoints, setWelfareMsg }: any) {
  const [betAmount, setBetAmount] = useState<number | "">("");
  const [betComment, setBetComment] = useState("");
  const [usedItem, setUsedItem] = useState<string>("NONE");
  const [predictedScore, setPredictedScore] = useState("");
  const [isBetting, setIsBetting] = useState(false);

  const handleBet = async (choice: "A" | "B") => {
    setError(null);
    const amount = Number(betAmount) || 0;
    const comment = betComment || "";

    if (amount <= 0) return setError("下注金额必须大于0");
    if (amount > points) return setError("积分不足，请重新输入");

    if (usedItem === "ITEM_FATAL" && !predictedScore) {
      return setError("致命打康启动失败：必须输入比分预测 (如 3-1)");
    }

    const previousPoints = points;
    setPoints((prev: number) => prev - amount);
    setIsBetting(true);

    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          matchId: match.id,
          choice,
          amount,
          comment,
          usedItem: usedItem !== "NONE" ? usedItem : null,
          predictedScore: usedItem === "ITEM_FATAL" ? predictedScore : null
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPoints(previousPoints);
        setError(data.error || "下注失败");
      } else {
        fetchUserPoints(userId);
        fetchMatches();
        setBetAmount("");
        setBetComment("");
      }
    } catch (err) {
      console.error("Bet error:", err);
      setPoints(previousPoints);
      setError("网络链接中断，请检查信号");
    } finally {
      setIsBetting(false);
    }
  };

  const handleCancelBet = async (originalAmount: number) => {
    setError(null);
    if (!confirm(`⚠️ 确定要撤回下注吗？\n将扣除 5% 的手续费 (预计退还 ${Math.floor(originalAmount * 0.95)} 积分)。`)) return;

    try {
      const res = await fetch("/api/bets/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, matchId: match.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "撤回失败");
      } else {
        fetchUserPoints(userId);
        fetchMatches();
        if (setWelfareMsg) {
           setWelfareMsg(`已撤回下注，退还 ${data.refund} 积分 (已扣除 5%)`);
           setTimeout(() => setWelfareMsg(null), 4000);
        }
      }
    } catch (err) {
      console.error("Cancel bet error:", err);
      setError("网络错误，无法撤回");
    }
  };

  const setQuickAmount = (amt: number | "ALL") => {
    let limit = 500;
    if (match.stageType === "GROUP") limit = sysSettings.GROUP_MAX;
    else if (match.stageType === "BRACKET") limit = Math.max(sysSettings.KO_MIN, Math.floor(points * (sysSettings.KO_PERCENT / 100)));
    const finalAmt = amt === "ALL" ? Math.min(points, limit) : Math.min(amt, limit);
    setBetAmount(finalAmt);
  };

  const isPlayerAdvanced = (playerName: string) => {
    return sysSettings.AWT_ADVANCED_PLAYERS?.includes(playerName.trim().toLowerCase());
  };

  const isPlayerEliminated = (playerName: string) => {
    return sysSettings.AWT_ELIMINATED_PLAYERS?.includes(playerName.trim().toLowerCase());
  };

  const isPlayerHexed = (playerName: string) => {
    return sysSettings.HEXED_PLAYERS?.includes(playerName.trim().toLowerCase());
  };

  return (
<motion.div

                  id={`match-${match.id}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-black/80 border-2 relative overflow-hidden backdrop-blur-md transition-all duration-300 transform -skew-x-2 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] scroll-mt-24 ${
                    match.status === "OPEN" ? "border-neutral-600 hover:border-red-500/50" : "border-neutral-800 opacity-80"
                  }`}
                >
                  {/* Settled Badge */}
                  {match.status === "SETTLED" && (
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black px-4 py-1 font-bold flex items-center shadow-[-4px_4px_0px_rgba(234,179,8,0.2)] z-20" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}>
                      胜者 (WINNER): {match.winner}
                    </div>
                  )}

                  {/* Decorative Corner */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white pointer-events-none z-20"></div>

                  {/* Counter Hit Badge */}
                  {match.status === "OPEN" && (() => {
                    const pA = match.poolA || 0;
                    const pB = match.poolB || 0;
                    const totalPool = pA + pB;
                    if (totalPool > 1000 && pA > 0 && pB > 0) {
                      const ratio = pA / pB;
                      if (ratio >= 9 || ratio <= (1/9)) {
                        return (
                          <div className="absolute -top-3 -right-3 rotate-12 z-50">
                            <div className="bg-red-600 text-white text-xs font-black px-3 py-1 border-2 border-yellow-400 shadow-[0_0_15px_rgba(239,68,68,1)] animate-pulse whitespace-nowrap">
                              ⚠️ 破招预警 (POTENTIAL COUNTER HIT!)
                            </div>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}

                  {/* Players Info */}
                  {/* Tug of War UI */}
                  <div className="px-6 mt-4 relative z-10 transform skew-x-2">
                     <div className="flex justify-between text-[10px] font-mono font-bold tracking-widest text-neutral-400 mb-1">
                        <div>POOL A: {(match.poolA || 0).toLocaleString()}</div>
                        <div>POOL B: {(match.poolB || 0).toLocaleString()}</div>
                     </div>
                     <div className="w-full h-3 bg-neutral-900 border border-neutral-700/50 flex overflow-hidden transform -skew-x-[10deg]">
                        <div
                          className="h-full bg-red-600 transition-all duration-500"
                          style={{ width: `${(match.poolA || 0) + (match.poolB || 0) === 0 ? 50 : ((match.poolA || 0) / ((match.poolA || 0) + (match.poolB || 0))) * 100}%`, boxShadow: "inset 0 0 5px rgba(0,0,0,0.5)" }}
                        ></div>
                        <div
                          className="h-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${(match.poolA || 0) + (match.poolB || 0) === 0 ? 50 : ((match.poolB || 0) / ((match.poolA || 0) + (match.poolB || 0))) * 100}%`, boxShadow: "inset 0 0 5px rgba(0,0,0,0.5)" }}
                        ></div>
                     </div>
                  </div>

                  {/* Players Info */}
                  <div className="flex justify-between items-center mb-3 mt-3 relative px-4 transform skew-x-2">
                    {/* VS Divider */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none pointer-events-none z-10">
                      {match.status === "SETTLED" && typeof match.scoreA === 'number' && typeof match.scoreB === 'number' ? (
                        <span
                          className="text-yellow-500 font-black italic my-1 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                          style={{ fontFamily: "var(--font-bebas)", fontSize: "2rem", textShadow: "0 0 10px rgba(234, 179, 8, 0.8), 0 0 20px rgba(234, 179, 8, 0.4)" }}
                        >
                          {match.scoreA} - {match.scoreB}
                        </span>
                      ) : (
                        <span
                          className="text-red-500 font-black italic my-1 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                          style={{ fontFamily: "var(--font-bebas)", fontSize: "1.5rem", textShadow: "0 0 10px rgba(239, 68, 68, 0.8), 0 0 20px rgba(239, 68, 68, 0.4)" }}
                        >
                          VS
                        </span>
                      )}
                    </div>

                    <div className={`flex-1 flex flex-col items-center text-center relative z-10 transition-all ${isPlayerAdvanced(match.playerA) ? 'drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : ''}`}>
                      {isPlayerHexed(match.playerA) && (
                        <div className="absolute -top-3 -right-3 bg-purple-900 text-purple-200 font-bold text-[8px] px-1 border-2 border-purple-500 transform -skew-x-12 z-30 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse" style={{ fontFamily: "var(--font-bebas)" }}>[ ROBBIE! ]</div>
                      )}
                      {isPlayerAdvanced(match.playerA) && (
                        <div className="absolute -top-4 text-yellow-400 font-black text-[10px] tracking-widest z-20" style={{ fontFamily: "var(--font-bebas)" }}>[ ✨ ADV ]</div>
                      )}
                      {isPlayerEliminated(match.playerA) && (
                        <div className="absolute -top-4 text-red-500 font-black text-[10px] tracking-widest z-20" style={{ fontFamily: "var(--font-bebas)" }}>[ 💀 ELIM ]</div>
                      )}
                      <div className={`mb-1 w-12 h-12 ${isPlayerEliminated(match.playerA) ? 'grayscale opacity-50' : ''}`}>
                        <PlayerAvatar playerName={match.playerA} charName={match.charA} playerType="A" />
                      </div>
                      <h3 className={`text-xl font-black mb-0 ${isPlayerAdvanced(match.playerA) ? 'text-yellow-400 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]' : 'text-white drop-shadow-[2px_2px_0px_rgba(239,68,68,0.8)]'} ${isPlayerEliminated(match.playerA) ? 'grayscale opacity-50' : ''}`} style={{ fontFamily: "var(--font-bebas)" }}>{match.playerA}</h3>
                    </div>

                    <div className="w-12"></div> {/* Spacer for VS */}

                    <div className={`flex-1 flex flex-col items-center text-center relative z-10 transition-all ${isPlayerAdvanced(match.playerB) ? 'drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : ''}`}>
                      {isPlayerHexed(match.playerB) && (
                        <div className="absolute -top-3 -right-3 bg-purple-900 text-purple-200 font-bold text-[8px] px-1 border-2 border-purple-500 transform -skew-x-12 z-30 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse" style={{ fontFamily: "var(--font-bebas)" }}>[ ROBBIE! ]</div>
                      )}
                      {isPlayerAdvanced(match.playerB) && (
                        <div className="absolute -top-4 text-yellow-400 font-black text-[10px] tracking-widest z-20" style={{ fontFamily: "var(--font-bebas)" }}>[ ✨ ADV ]</div>
                      )}
                      {isPlayerEliminated(match.playerB) && (
                        <div className="absolute -top-4 text-red-500 font-black text-[10px] tracking-widest z-20" style={{ fontFamily: "var(--font-bebas)" }}>[ 💀 ELIM ]</div>
                      )}
                      <div className={`mb-1 w-12 h-12 ${isPlayerEliminated(match.playerB) ? 'grayscale opacity-50' : ''}`}>
                        <PlayerAvatar playerName={match.playerB} charName={match.charB} playerType="B" />
                      </div>
                      <h3 className={`text-xl font-black mb-0 ${isPlayerAdvanced(match.playerB) ? 'text-yellow-400 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]' : 'text-white drop-shadow-[2px_2px_0px_rgba(59,130,246,0.8)]'} ${isPlayerEliminated(match.playerB) ? 'grayscale opacity-50' : ''}`} style={{ fontFamily: "var(--font-bebas)" }}>{match.playerB}</h3>
                    </div>
                  </div>

                  {/* Betting Area */}
                  {match.status === "OPEN" && (!match.lockAt || new Date() < new Date(match.lockAt)) ? (
                    <div className="bg-neutral-950/60 rounded p-3 border border-neutral-800/50 relative z-20">
                      {!userId ? (
                        <button
                          onClick={() => window.location.href = "/"}
                          className="w-full py-2 ggst-button border-neutral-500 hover:bg-neutral-800 focus-visible:outline-none"
                          style={{ boxShadow: "2px 2px 0px 0px rgba(115, 115, 115, 0.8)", fontSize: "1rem" }}
                        >
                          [ 🔑 连入终端 (LOGIN) ]
                        </button>
                      ) : (
                        <>
                          {/* Roman Cancel (Cancel Bet) */}
                          {match.bets?.some((b: any) => b.userId === userId) && (
                            <div className="mb-2">
                              <button
                                onClick={() => {
                                  const userBet = match.bets?.find((b: any) => b.userId === userId);
                                  if (userBet) handleCancelBet(userBet.amount);
                                }}
                                className="w-full py-1 bg-yellow-900/40 border border-yellow-600/50 text-yellow-500 hover:bg-yellow-800/60 hover:text-yellow-400 font-bold tracking-widest transition-all rounded text-sm"
                                style={{ fontFamily: "var(--font-bebas)" }}
                              >
                                [ 🔄 RC取消 (扣5%) ]
                              </button>
                            </div>
                          )}

                          <div className="flex justify-between items-center mb-2">
                            <label htmlFor={`bet-amount-${match.id}`} className="text-[10px] text-neutral-400 font-bold tracking-widest uppercase truncate">投入分数 <span className="text-yellow-500 ml-1">
                                {(() => {
                                  if (match.stageType === "GROUP") return `(Max ${sysSettings.GROUP_MAX})`;
                                  if (match.stageType === "BRACKET") {
                                    const currentLimit = Math.max(sysSettings.KO_MIN, Math.floor(points * (sysSettings.KO_PERCENT / 100)));
                                    return `(Max ${currentLimit})`;
                                  }
                                  return "";
                                })()}
                              </span>
                            </label>
                            <div className="flex gap-1 shrink-0">
                              {[100, 500].map(amt => (
                                <button
                                  key={amt}
                                  onClick={() => setQuickAmount(amt)}
                                  className="text-[10px] bg-neutral-800 hover:bg-neutral-700 focus-visible:ring-1 focus-visible:ring-neutral-500 focus-visible:outline-none text-neutral-300 px-1.5 py-0.5 rounded transition-colors border border-neutral-700"
                                  aria-label={`快捷下注 ${amt} 积分`}
                                >
                                  +{amt}
                                </button>
                              ))}
                              <button
                                onClick={() => setQuickAmount("ALL")}
                                className="text-[10px] bg-red-900/40 hover:bg-red-800/60 focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:outline-none text-red-400 px-1.5 py-0.5 rounded transition-colors border border-red-900/50 font-bold"
                                aria-label="全押"
                              >
                                MAX
                              </button>
                            </div>
                          </div>

                          <input
                            id={`bet-amount-${match.id}`}
                            type="number"
                            min="0"
                            max={(() => {
                              if (match.stageType === "GROUP") return Math.min(points, sysSettings.GROUP_MAX);
                              if (match.stageType === "BRACKET") return Math.min(points, Math.max(sysSettings.KO_MIN, Math.floor(points * (sysSettings.KO_PERCENT / 100))));
                              return Math.min(points, 500);
                            })()}
                            value={betAmount}
                            onChange={(e) => {
                              let val = parseInt(e.target.value) || 0;
                              let limit = 500;
                              if (match.stageType === "GROUP") limit = sysSettings.GROUP_MAX;
                              else if (match.stageType === "BRACKET") limit = Math.max(sysSettings.KO_MIN, Math.floor(points * (sysSettings.KO_PERCENT / 100)));
                              if (val > limit) val = limit;
                              setBetAmount(val === 0 ? "" : val);
                            }}
                            placeholder={(() => {
                              if (match.stageType === "GROUP") return `输入注额... (Max ${sysSettings.GROUP_MAX})`;
                              if (match.stageType === "BRACKET") return `输入注额... (Max ${Math.max(sysSettings.KO_MIN, Math.floor(points * (sysSettings.KO_PERCENT / 100)))})`;
                              return "输入注额... (Max 500)";
                            })()}
                            className="w-full bg-neutral-900 border border-neutral-700/50 rounded p-2 text-white focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 font-mono text-center text-sm mb-2 transition-all"
                          />

                          <input
                            type="text"
                            value={betComment}
                            onChange={(e) => setBetComment(e.target.value)}
                            placeholder="留言 (Optional Comment)..."
                            maxLength={50}
                            className="w-full bg-neutral-900/50 border border-neutral-800 rounded p-2 text-neutral-300 text-xs focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 mb-2 transition-all placeholder:text-neutral-600"
                          />

                          {/* Tactical Gear Selection */}
                          <div className="mb-3 bg-neutral-900/30 p-2 rounded border border-neutral-800">
                            <h4 className="text-[10px] text-neutral-500 font-bold tracking-widest uppercase mb-1 flex items-center gap-1">
                              <span className="text-yellow-500">⚙️</span> TACTICAL GEAR
                            </h4>
                            <div className="flex flex-col gap-1">
                              <label className={`flex items-center gap-1 p-1 rounded cursor-pointer transition-colors ${usedItem === "NONE" ? "bg-neutral-800/80 border border-neutral-600" : "hover:bg-neutral-800/50 border border-transparent"}`}>
                                <input type="radio" name={`gear-${match.id}`} value="NONE" checked={usedItem === "NONE"} onChange={() => setUsedItem("NONE")} className="accent-neutral-500 w-3 h-3" />
                                <span className="text-xs text-neutral-300 font-medium">无装备</span>
                              </label>
                              <label className={`flex items-center justify-between p-1 rounded cursor-pointer transition-colors ${usedItem === "ITEM_FD" ? "bg-blue-900/30 border border-blue-500/50" : "hover:bg-neutral-800/50 border border-transparent"} ${fdShields <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}>
                                <div className="flex items-center gap-1">
                                  <input type="radio" name={`gear-${match.id}`} value="ITEM_FD" checked={usedItem === "ITEM_FD"} disabled={fdShields <= 0} onChange={() => setUsedItem("ITEM_FD")} className="accent-blue-500 w-3 h-3" />
                                  <span className="text-xs text-blue-300 font-medium">🛡️ 完美防御</span>
                                </div>
                                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-1 py-0.5 rounded">{fdShields}</span>
                              </label>
                              <label className={`flex items-center justify-between p-1 rounded cursor-pointer transition-colors ${usedItem === "ITEM_FATAL" ? "bg-red-900/30 border border-red-500/50" : "hover:bg-neutral-800/50 border border-transparent"} ${fatalCounters <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}>
                                <div className="flex items-center gap-1">
                                  <input type="radio" name={`gear-${match.id}`} value="ITEM_FATAL" checked={usedItem === "ITEM_FATAL"} disabled={fatalCounters <= 0} onChange={() => setUsedItem("ITEM_FATAL")} className="accent-red-500 w-3 h-3" />
                                  <span className="text-xs text-red-300 font-medium">⚡ 致命打康</span>
                                </div>
                                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-1 py-0.5 rounded">{fatalCounters}</span>
                              </label>

                              {/* Fatal Counter Prediction Input */}
                              <AnimatePresence>
                                {usedItem === "ITEM_FATAL" && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden mt-1 ml-4"
                                  >
                                    <input
                                      type="text"
                                      value={predictedScore}
                                      onChange={(e) => setPredictedScore(e.target.value)}
                                      placeholder="比分预测 (例: 3-1)"
                                      className="w-full bg-red-950/20 border border-red-900/50 rounded p-1 text-red-200 text-xs focus:outline-none focus:border-red-500 font-mono"
                                    />
                                    <p className="text-[9px] text-red-500/70 mt-0.5">* 胜方分-败方分</p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleBet("A")}
                              disabled={isBetting || !betAmount}
                              className="flex-1 py-2 ggst-button border-red-500 hover:bg-red-600 focus-visible:outline-none text-sm"
                              style={{ boxShadow: "2px 2px 0px 0px rgba(239, 68, 68, 0.8)" }}
                              aria-label={`押注选手 A: ${match.playerA}`}
                            >
                              {isBetting ? "..." : (!betAmount ? "输入分数" : "押注 A")}
                            </button>

                            <button
                              onClick={() => handleBet("B")}
                              disabled={isBetting || !betAmount}
                              className="flex-1 py-2 ggst-button border-blue-500 hover:bg-blue-600 focus-visible:outline-none text-sm"
                              style={{ boxShadow: "2px 2px 0px 0px rgba(59, 130, 246, 0.8)" }}
                              aria-label={`押注选手 B: ${match.playerB}`}
                            >
                              {isBetting ? "..." : (!betAmount ? "输入分数" : "押注 B")}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : match.status !== "SETTLED" ? (
                    <div className="bg-neutral-900/80 rounded py-4 px-3 border border-neutral-800 flex flex-col items-center justify-center min-h-[100px] relative z-20">
                      <div className="text-yellow-500/50 text-2xl mb-1">🔒</div>
                      <div className="text-yellow-500 font-bold tracking-widest text-lg mb-0.5" style={{ fontFamily: "var(--font-bebas)" }}>已封盘 (LOCKED)</div>
                      <div className="text-neutral-500 text-[10px]">当前比赛已停止下注</div>
                    </div>
                  ) : null}

                  {/* Comments & Bets Feed */}
                  <div className="mt-4 pt-3 border-t border-neutral-800/50">
                    <h4 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase mb-2 flex items-center gap-1">
                      <span>📡 INTEL FEED</span>
                    </h4>

                    {(!match.bets || match.bets.length === 0) ? (
                      <div className="py-4 text-center text-[10px] text-neutral-600 font-mono border border-dashed border-neutral-800/50 rounded bg-neutral-900/20">
                        No intel yet.
                      </div>
                    ) : (
                      <div
                        className="space-y-2 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent"
                        style={{ maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)" }}
                      >
                        {match.bets.map((bet: any) => {
                          const isRed = bet.choice === 'A';
                          const accentColor = isRed ? 'border-l-red-500 bg-gradient-to-r from-red-950/30 to-transparent' : 'border-l-blue-500 bg-gradient-to-r from-blue-950/30 to-transparent';
                          const textColor = isRed ? 'text-red-400' : 'text-blue-400';
                          const playerName = isRed ? match.playerA : match.playerB;

                          return (
                            <div key={bet.id} className={`rounded-r-lg p-3 text-sm border-l-2 ${accentColor} border-y border-r border-neutral-800/30`}>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-300">
                    <span
                      className="font-black text-white"
                      style={{
                        color: bet.user?.nameColor || "#ffffff",
                        textShadow: (bet.user?.nameColor && bet.user.nameColor !== "#ffffff") ? `0 0 5px ${bet.user.nameColor}80` : undefined
                      }}
                    >
                      {bet.user.displayName || bet.user.username}
                    </span>
                                <span className="text-neutral-500">投入了</span>
                                <span className="font-mono text-yellow-500/90 font-bold">{bet.amount} 积分</span>
                                <span className="text-neutral-500">支持</span>
                                <span className={`font-bold ${textColor}`}>{playerName}</span>
                              </div>

                              {bet.comment && (
                                <div className="mt-2 text-neutral-400 text-xs italic break-words relative">
                                  <div className={`absolute -left-2 top-0 bottom-0 w-0.5 rounded ${isRed ? 'bg-red-900/50' : 'bg-blue-900/50'}`}></div>
                                  <p className="pl-2">&quot;{bet.comment}&quot;</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </motion.div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [betAmount, setBetAmount] = useState<Record<string, number>>({});
  const [betComment, setBetComment] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [welfareMsg, setWelfareMsg] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [isBetting, setIsBetting] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"OPEN" | "ALL" | "SETTLED">("OPEN");
  const [stageFilter, setStageFilter] = useState<"ALL" | "GROUP" | "BRACKET">("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [fdShields, setFdShields] = useState<number>(0);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [fatalCounters, setFatalCounters] = useState<number>(0);

  const [sysSettings, setSysSettings] = useState<{ GROUP_MAX: number, KO_PERCENT: number, KO_MIN: number, AWT_ADVANCED_PLAYERS: string[], AWT_ELIMINATED_PLAYERS: string[], HEXED_PLAYERS: string[], MEGAPHONE_MESSAGES: any[] }>({
    GROUP_MAX: 300,
    KO_PERCENT: 50,
    KO_MIN: 200,
    AWT_ADVANCED_PLAYERS: [],
    AWT_ELIMINATED_PLAYERS: [],
    HEXED_PLAYERS: [],
    MEGAPHONE_MESSAGES: []
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        const newSettings = {
          GROUP_MAX: 300,
          KO_PERCENT: 50,
          KO_MIN: 200,
          AWT_ADVANCED_PLAYERS: [] as string[],
          AWT_ELIMINATED_PLAYERS: [] as string[],
          HEXED_PLAYERS: [] as string[],
          MEGAPHONE_MESSAGES: [] as any[]
        };
        data.forEach((s: any) => {
          if (s.key === "GROUP_MAX") newSettings.GROUP_MAX = parseInt(s.value, 10);
          if (s.key === "KO_PERCENT") newSettings.KO_PERCENT = parseInt(s.value, 10);
          if (s.key === "KO_MIN") newSettings.KO_MIN = parseInt(s.value, 10);
          if (s.key.startsWith("AWT_ADVANCED_PLAYERS") && s.value) {
            let names = s.value;
            // It might be stored as a JSON array by generate-bracket, so let's parse safely
            try {
               const parsed = JSON.parse(s.value);
               if (Array.isArray(parsed)) {
                 names = parsed.join(",");
               }
            } catch(e) {}
            newSettings.AWT_ADVANCED_PLAYERS.push(...names.split(',').map((p: string) => p.trim().toLowerCase()).filter(Boolean));
          }
          if (s.key === "AWT_ELIMINATED_PLAYERS" && s.value) {
            newSettings.AWT_ELIMINATED_PLAYERS = s.value.split(',').map((p: string) => p.trim().toLowerCase()).filter(Boolean);
          }
          if (s.key === "HEXED_PLAYERS" && s.value) {
            newSettings.HEXED_PLAYERS = s.value.split(',').map((p: string) => p.trim().toLowerCase()).filter(Boolean);
          }
          if (s.key === "MEGAPHONE_MESSAGES" && s.value) {
            try {
              const parsed = JSON.parse(s.value);
              if (Array.isArray(parsed)) {
                newSettings.MEGAPHONE_MESSAGES = parsed.filter(m => m.expiresAt > Date.now());
              }
            } catch (e) {
              console.error("Failed to parse MEGAPHONE_MESSAGES");
            }
          }
        });
        setSysSettings(newSettings);
      }
    } catch (e) {
      console.error("Failed to fetch settings");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserId = localStorage.getItem("userId");
      const storedUsername = localStorage.getItem("username");
      const storedDisplayName = localStorage.getItem("displayName");

      if (storedUserId) {
        setUserId(storedUserId);
        setUsername(storedUsername || "Unknown");
        setDisplayName(storedDisplayName || storedUsername || "Unknown");
        setNewName(storedDisplayName || storedUsername || "Unknown");
      } else {
        setUserId(""); // Ensure it's clear
      }

      const initFetch = async () => {
        if (storedUserId) {
          await fetchData(storedUserId);
        } else {
          // Unauthenticated users still need to fetch matches and settings
          await fetchMatches();
          const resSetting = await fetch("/api/settings");
          if (resSetting.ok) {
            const dataSetting = await resSetting.json();
            const newSettings = { ...sysSettings };
            dataSetting.forEach((s: any) => {
              newSettings[s.key as keyof typeof sysSettings] = s.value;
            });
            setSysSettings(newSettings);
          }
        }
        await fetchSettings();
        setIsInitialLoad(false);
      };

      initFetch();

      const intervalId = setInterval(() => {
        fetchMatches();
        if (storedUserId) fetchUserPoints(storedUserId);
        fetchLeaderboard();
        fetchSettings();
      }, 15000);

      return () => clearInterval(intervalId);
    }
  }, [router]);

  const fetchData = async (id: string = userId) => {
    setIsRefreshing(true);
    if (id) {
        await Promise.all([fetchUserPoints(id), fetchMatches(), fetchLeaderboard()]);
    } else {
        await Promise.all([fetchMatches(), fetchLeaderboard()]);
    }
    setTimeout(() => setIsRefreshing(false), 500); // Minimum animation time
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/users/leaderboard?limit=5");
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.users || data);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    }
  };

  const fetchUserPoints = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPoints(data.points);
        setFdShields(data.fdShields || 0);
        setFatalCounters(data.fatalCounters || 0);
        if (typeof window !== "undefined") localStorage.setItem("points", data.points.toString());
        if (typeof window !== "undefined" && data.winStreak !== undefined) localStorage.setItem("winStreak", data.winStreak.toString());
      }
    } catch (err) {
      console.error("Failed to fetch user points", err);
    }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      if (res.ok) setMatches(await res.json());
    } catch (err) {
      console.error("Failed to fetch matches", err);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") localStorage.clear();
    router.push("/");
  };

  const handleWelfare = async () => {
    try {
      const res = await fetch("/api/users/welfare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (res.ok) {
        setPoints(data.points);
        setError(null);
        setWelfareMsg(data.message);

        // Trigger Confetti!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ef4444', '#facc15', '#ffffff']
        });

        setTimeout(() => setWelfareMsg(null), 4000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error(err);
      setError("网络错误，无法请求救济金");
    }
  };


  const handleBet = async (matchId: string, choice: "A" | "B") => {
    setError(null);
    const amount = betAmount[matchId] || 0;
    const comment = betComment[matchId] || "";

    if (amount <= 0) return setError("下注金额必须大于0");
    if (amount > points) return setError("积分不足，请重新输入");

    // Optimistic Update
    const previousPoints = points;
    setPoints((prev) => prev - amount);
    setIsBetting((prev) => ({ ...prev, [matchId]: true }));

    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, matchId, choice, amount, comment }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Rollback on failure
        setPoints(previousPoints);
        setError(data.error || "下注失败");
      } else {
        // Sync with server on success
        fetchUserPoints(userId);
        fetchMatches(); // refresh match list to show updated bets
        setBetAmount((prev) => ({ ...prev, [matchId]: 0 }));
        setBetComment((prev) => ({ ...prev, [matchId]: "" }));
      }
    } catch (err) {
      console.error("Bet error:", err);
      // Rollback on network error
      setPoints(previousPoints);
      setError("网络链接中断，请检查信号");
    } finally {
      setIsBetting((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  const handleCancelBet = async (matchId: string, originalAmount: number) => {
    setError(null);
    if (!confirm(`⚠️ 确定要撤回下注吗？\n将扣除 5% 的手续费 (预计退还 ${Math.floor(originalAmount * 0.95)} 积分)。`)) return;

    try {
      const res = await fetch("/api/bets/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, matchId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "撤回失败");
      } else {
        // Sync with server on success
        fetchUserPoints(userId);
        fetchMatches(); // refresh match list
        setWelfareMsg(`已撤回下注，退还 ${data.refund} 积分 (已扣除 5%)`);
        setTimeout(() => setWelfareMsg(null), 4000);
      }
    } catch (err) {
      console.error("Cancel bet error:", err);
      setError("网络错误，无法撤回");
    }
  };

  const setQuickAmount = (matchId: string, amt: number | "ALL", match?: Match) => {
    let limit = 500;
    if (match) {
        if (match.stageType === "GROUP") limit = sysSettings.GROUP_MAX;
        else if (match.stageType === "BRACKET") limit = Math.max(sysSettings.KO_MIN, Math.floor(points * (sysSettings.KO_PERCENT / 100)));
    }
    const finalAmt = amt === "ALL" ? Math.min(points, limit) : Math.min(amt, limit);
    setBetAmount((prev) => ({ ...prev, [matchId]: finalAmt }));
  };

  const filteredMatches = useMemo(() => {
    let result = matches;
    if (filter === "ALL") return result;
    return result.filter(m => m.status === filter);
  }, [matches, filter]);

  return (
      <AppLayout>
        <div className="max-w-5xl mx-auto p-4 sm:p-8 relative">

        <div className="mb-12 border-b-4 border-red-600 pb-4 text-center transform -skew-x-2">
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-widest drop-shadow-[4px_4px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
            AWT 2026 KOREA <span className="text-red-500">-</span> GLOBAL BETTING HUB
          </h1>
          <p className="text-neutral-400 mt-2 font-mono tracking-widest font-bold uppercase">The Pulse of the FGC</p>
          {!userId && (
            <div className="mt-6">
              <a href="/" className="ggst-button bg-red-600 hover:bg-red-500 text-white text-xl py-3 px-8 shadow-[4px_4px_0px_rgba(0,0,0,1)] inline-block transform skew-x-2">
                [ 🔑 连入终端 (LOGIN TO BET) ]
              </a>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-8 relative z-10 transform skew-x-2 min-h-[40px]">
          <div className="flex gap-4 items-center">
            {!isInitialLoad && points < 50 && (
              <button
                onClick={handleWelfare}
                className="ggst-button border-red-500 hover:bg-red-600 text-xs px-4 py-2 shadow-[2px_2px_0px_0px_rgba(239,68,68,0.8)] animate-pulse transform -skew-x-2"
              >
                ⚕️ FAUST 紧急救治 (领取 100 积分)
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => fetchData()}
              disabled={isRefreshing}
              className="ggst-button border-neutral-500 hover:bg-neutral-600 px-4 py-2 text-sm shadow-[2px_2px_0px_rgba(115,115,115,0.8)] transform -skew-x-2 flex items-center gap-2"
              aria-label="刷新数据"
            >
              <motion.span
                animate={{ rotate: isRefreshing ? 360 : 0 }}
                transition={{ repeat: isRefreshing ? Infinity : 0, duration: 1, ease: "linear" }}
                className="inline-block"
              >
                ⟳
              </motion.span>
              REFRESH
            </button>
            <button
              onClick={() => setShowRules(true)}
              className="ggst-button border-blue-500 hover:bg-blue-600 px-4 py-2 text-sm shadow-[2px_2px_0px_rgba(59,130,246,0.8)] transform -skew-x-2"
              aria-label="Rules"
            >
              RULES [?]
            </button>
          </div>
        </div>

        {/* Rulebook Modal */}
        <AnimatePresence>
          {showRules && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-[#111111] border-4 border-red-600 p-8 max-w-lg w-full shadow-[10px_10px_0px_rgba(239,68,68,0.5)] transform -skew-x-2 relative"
              >
                <button
                  onClick={() => setShowRules(false)}
                  className="absolute top-2 right-4 text-white hover:text-red-500 text-3xl font-bold font-sans transform skew-x-2"
                >
                  &times;
                </button>
                <div className="transform skew-x-2">
                  <h2 className="text-3xl font-black text-white mb-4 tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]">
                    📜 预测战情中心 - 玩法指南
                  </h2>
                  <div className="space-y-4 text-neutral-300 font-medium text-sm leading-relaxed">
                    <p>
                      <strong className="text-red-400 text-lg">🎯 比赛状态</strong><br/>
                      🔴 LET&apos;S ROCK: 盘口已开，允许下注。<br/>
                      ⚔️ SLASH!: 战斗进行中或已结束，等待管理员结算。
                    </p>
                    <p>
                      <strong className="text-red-400 text-lg">💰 结算规则 (Pari-Mutuel)</strong><br/>
                      玩家投入的积分形成奖池。【胜者】阵营的玩家将按自己投入的比例，平分【败者】阵营的奖池积分！
                    </p>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={() => setShowRules(false)}
                      className="ggst-button px-8 py-3 text-xl border-red-500"
                    >
                      UNDERSTOOD
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Error Notification */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6 relative z-10 transform -skew-x-2"
            >
              <div className="bg-red-950/80 border-2 border-red-500 text-red-200 p-4 flex items-center justify-between shadow-[4px_4px_0px_rgba(239,68,68,1)] animate-ggst-shake" role="alert">
                <span className="font-bold tracking-widest flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}>⚠️ {error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-white transition-colors p-1" aria-label="关闭提示">✕</button>
              </div>
            </motion.div>
          )}
          {welfareMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.9 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.9 }}
              className="overflow-hidden mb-6 relative z-10 transform -skew-x-2"
            >
              <div className="bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400 p-4 flex items-center justify-between shadow-[4px_4px_0px_rgba(234,179,8,1)] animate-ggst-shake" role="alert">
                <span className="font-bold tracking-widest flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.5rem" }}>☄️ {welfareMsg}</span>
                <button onClick={() => setWelfareMsg(null)} className="text-yellow-500 hover:text-white transition-colors p-1" aria-label="关闭提示">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SALT MEGAPHONE TICKER */}
        {sysSettings.MEGAPHONE_MESSAGES && sysSettings.MEGAPHONE_MESSAGES.length > 0 && (
          <div className="mb-8 w-full overflow-hidden bg-black border-y-4 border-yellow-500 relative transform -skew-x-6 shadow-[0_0_15px_rgba(234,179,8,0.5)]">
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>

            {/* Warning Tape Stripes bg */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, #eab308 10px, #eab308 20px)'
              }}
            ></div>

            <div className="absolute left-0 top-0 bottom-0 bg-yellow-500 text-black px-4 flex items-center z-20 font-black italic shadow-[4px_0_0_rgba(0,0,0,1)]">
              <span className="animate-pulse flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.5rem" }}>
                <span className="text-xl">📢</span> BROADCAST
              </span>
            </div>

            <div className="flex whitespace-nowrap overflow-hidden py-3">
              <motion.div
                className="flex items-center gap-16 font-mono text-xl text-yellow-400 pl-48"
                animate={{ x: ["0%", "-100%"] }}
                transition={{
                  repeat: Infinity,
                  ease: "linear",
                  duration: Math.max(20, sysSettings.MEGAPHONE_MESSAGES.length * 10),
                }}
              >
                {/* Double the messages array to create a seamless loop */}
                {[...sysSettings.MEGAPHONE_MESSAGES, ...sysSettings.MEGAPHONE_MESSAGES].map((msg, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-white bg-red-600 px-2 py-0.5 rounded-sm font-bold text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      {msg.author}
                    </span>
                    <span className="font-bold tracking-widest drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                      &quot;{msg.text}&quot;
                    </span>
                    <span className="text-red-500 mx-4">♦</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 w-full">
          {/* Main Matches Area (Left) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Balance Display & Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="bg-black/80 border-2 border-yellow-500 p-3 transform -skew-x-2 shadow-[4px_4px_0px_rgba(234,179,8,1)]">
                <span className="text-xl font-bold tracking-widest text-yellow-400 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                  当前余额: {points.toLocaleString()} W$
                </span>
              </div>
              <div className="flex gap-2 bg-[#000000] p-1.5 w-fit border-2 border-neutral-800 shadow-[4px_4px_0px_rgba(38,38,38,1)] transform -skew-x-2">
              {(["OPEN", "SETTLED", "ALL"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-2 font-bold tracking-widest transition-all focus-visible:outline-none ${
                    filter === f
                      ? "bg-blue-600 text-white shadow-[2px_2px_0px_rgba(37,99,235,0.5)] transform translate-x-[1px] translate-y-[1px]"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                  }`}
                  style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}
                  aria-pressed={filter === f}
                >
                  {f === "OPEN" ? "🔥 LET'S ROCK" : f === "SETTLED" ? "⚔️ SLASH!" : "📋 ALL"}
                </button>
              ))}
              </div>
            </div>

            {/* Main Content Area */}
            {filteredMatches.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-black/50 border-2 border-neutral-800 border-dashed backdrop-blur-sm relative z-10 transform -skew-x-2 w-full"
              >
                <p className="text-neutral-500 font-bold text-2xl tracking-widest">等待玩家投币挑战 (INSERT COIN...)</p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-6">
                {Object.entries(
                  filteredMatches.reduce((acc, match) => {
                    const group = match.groupName || "UNASSIGNED";
                    if (!acc[group]) acc[group] = [];
                    acc[group].push(match);
                    return acc;
                  }, {} as Record<string, Match[]>)
                )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([groupName, groupMatches]) => (
                  <div key={groupName} className="flex flex-col gap-2">
                    {groupName !== "UNASSIGNED" && (
                      <div className="border-l-4 border-blue-500 bg-gray-900/50 py-1 px-3 mt-4 mb-2 w-fit transform -skew-x-2">
                         <h2 className="text-xl font-bold text-white tracking-widest uppercase drop-shadow-[1px_1px_0px_rgba(59,130,246,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                           {groupName}
                         </h2>
                      </div>
                    )}
                    <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 relative z-10 w-full" layout>
                      <AnimatePresence>
                        {groupMatches.map((match) => (
                           <MatchCard
                             key={match.id}
                             match={match}
                             userId={userId}
                             points={points}
                             fdShields={fdShields}
                             fatalCounters={fatalCounters}
                             sysSettings={sysSettings}
                             fetchUserPoints={fetchUserPoints}
                             fetchMatches={fetchMatches}
                             setError={setError}
                             setPoints={setPoints}
                             setWelfareMsg={setWelfareMsg}
                           />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Leaderboard / Live Intel */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {!isInitialLoad && (
              <div className="bg-black/80 border-4 border-red-600 p-6 shadow-[0_0_15px_rgba(239,68,68,0.6)] transform -skew-x-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white pointer-events-none z-20"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white pointer-events-none z-20"></div>

                <h3 className="text-3xl font-black text-white mb-6 tracking-widest transform skew-x-2 flex items-center gap-3 drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                  <span className="text-red-500 animate-pulse">🔥</span> 悬赏榜单 (HIGH SCORES)
                </h3>

                <div className="space-y-3 transform skew-x-2">
                  {leaderboard.length === 0 ? (
                    <p className="text-neutral-500 text-lg font-mono font-bold animate-pulse">INSERT COIN...</p>
                  ) : (
                    leaderboard.map((user, index) => {
                      const isTop3 = index < 3;
                      const isFirst = index === 0;
                      const rankText = index === 0 ? '1ST' : index === 1 ? '2ND' : index === 2 ? '3RD' : `${index + 1}TH`;

                      return (
                        <div key={user.id} className={`flex justify-between items-center font-mono p-3 border-l-4 transition-all hover:translate-x-1 ${
                          isFirst ? 'border-yellow-400 bg-yellow-900/20 shadow-[0_0_10px_rgba(250,204,21,0.3)]' :
                          isTop3 ? 'border-red-500 bg-red-900/20' :
                          'border-neutral-700 bg-neutral-900/40'
                        }`}>
                          <div className="flex items-center gap-3 truncate">
                            <span className={`font-black tracking-widest ${
                              isFirst ? 'text-yellow-400 text-2xl drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]' :
                              isTop3 ? 'text-red-400 text-xl' :
                              'text-neutral-500 text-lg'
                            }`} style={{ fontFamily: "var(--font-bebas)" }}>{rankText}</span>

                            <span className={`truncate font-bold ${
                              isFirst ? 'text-white text-xl' :
                              isTop3 ? 'text-gray-100 text-lg' :
                              'text-neutral-400'
                            }`} style={user.nameColor && user.nameColor !== "#ffffff" ? { color: user.nameColor, textShadow: "0 0 5px currentColor" } : {}}>
                              {user.displayName}
                            </span>
                          </div>

                          <span className={`font-black ml-2 shrink-0 tracking-widest ${
                            isFirst ? 'text-yellow-400 text-2xl drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]' :
                            isTop3 ? 'text-red-400 text-xl' :
                            'text-neutral-500 text-lg'
                          }`} style={{ fontFamily: "var(--font-bebas)" }}>
                            {user.points.toLocaleString()}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
        </div>
      </AppLayout>
  );
}