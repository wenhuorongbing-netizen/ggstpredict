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


function MatchCard({ match, userId, points, sysSettings, fetchUserPoints, fetchMatches, setError, setPoints, setWelfareMsg }: any) {
  const [betAmount, setBetAmount] = useState<number | "">("");
  const [betComment, setBetComment] = useState("");
  const [isBetting, setIsBetting] = useState(false);

  const handleBet = async (choice: "A" | "B") => {
    setError(null);
    const amount = Number(betAmount) || 0;
    const comment = betComment || "";

    if (amount <= 0) return setError("下注金额必须大于0");
    if (amount > points) return setError("积分不足，请重新输入");

    const previousPoints = points;
    setPoints((prev: number) => prev - amount);
    setIsBetting(true);

    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, matchId: match.id, choice, amount, comment }),
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

  return (
<motion.div

                  id={`match-${match.id}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`relative overflow-hidden transition-all duration-300 transform -skew-x-2 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] scroll-mt-24 clip-match-card ${
                    match.status === "OPEN" ? "border-b-4 border-[#1a1a1a] hover:border-[#D91616]" : "border-b-4 border-neutral-800 opacity-80"
                  }`}
                >
                  {/* Split Red/Blue Background */}
                  <div className="absolute inset-0 flex pointer-events-none z-0">
                    <div className="flex-1 bg-gradient-to-br from-[#D91616]/80 to-black/90"></div>
                    <div className="flex-1 bg-gradient-to-bl from-[#0055FF]/80 to-black/90"></div>
                  </div>
                  <div className="absolute inset-0 pointer-events-none z-0 opacity-5" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }}></div>
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
                          <div className="absolute -top-3 -right-3 rotate-12 z-50 clip-chamfer">
                            <div className="bg-red-600 text-white text-xs font-black px-3 py-1 border-2 border-yellow-400 shadow-[0_0_15px_rgba(239,68,68,1)] animate-pulse whitespace-nowrap">
                              ⚠️ 破招预警 (POTENTIAL COUNTER HIT!)
                            </div>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}

                  {/* Tug of War UI */}
                  <div className="px-6 mt-4 relative z-10 transform skew-x-2">
                     <div className="flex justify-between text-[10px] font-mono font-bold tracking-widest text-neutral-400 mb-1">
                        <div className="text-[#D91616] drop-shadow-[1px_1px_0px_#000]">POOL A: {(match.poolA || 0).toLocaleString()}</div>
                        <div className="text-[#0055FF] drop-shadow-[1px_1px_0px_#000]">POOL B: {(match.poolB || 0).toLocaleString()}</div>
                     </div>
                     <div className="w-full h-3 bg-neutral-900 border-2 border-[#1a1a1a] flex overflow-hidden transform -skew-x-[10deg]">
                        <div
                          className="h-full bg-[#D91616] transition-all duration-500"
                          style={{ width: `${(match.poolA || 0) + (match.poolB || 0) === 0 ? 50 : ((match.poolA || 0) / ((match.poolA || 0) + (match.poolB || 0))) * 100}%`, boxShadow: "inset 0 0 5px rgba(0,0,0,0.5)" }}
                        ></div>
                        <div
                          className="h-full bg-[#0055FF] transition-all duration-500"
                          style={{ width: `${(match.poolA || 0) + (match.poolB || 0) === 0 ? 50 : ((match.poolB || 0) / ((match.poolA || 0) + (match.poolB || 0))) * 100}%`, boxShadow: "inset 0 0 5px rgba(0,0,0,0.5)" }}
                        ></div>
                     </div>
                  </div>

                  {/* Players Info */}
                  <div className="relative w-full h-40 flex overflow-hidden mt-6 mb-6 group transform skew-x-2" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
                    {/* Player 1 Side (Red) */}
                    <div className="w-1/2 h-full bg-gradient-to-r from-red-900/80 to-red-950/20 flex flex-col justify-center pl-6 border-b-4 border-red-600 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 clip-chamfer border-2 border-[#D91616] shadow-[4px_4px_0px_#000]">
                          <PlayerAvatar playerName={match.playerA} charName={match.charA} playerType="A" />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-4xl font-black text-white drop-shadow-[4px_4px_0px_#000]" style={{ fontFamily: "var(--font-bebas)" }}>{match.playerA}</h3>
                          <p className="text-sm text-[#D91616] font-black tracking-widest uppercase bg-black/50 px-2 self-start mt-1">Player A</p>
                        </div>
                      </div>
                    </div>

                    {/* Player 2 Side (Blue) */}
                    <div className="w-1/2 h-full bg-gradient-to-l from-blue-900/80 to-blue-950/20 flex flex-col justify-center items-end pr-6 border-b-4 border-blue-600 relative z-10">
                      <div className="flex items-center gap-4 flex-row-reverse">
                        <div className="w-20 h-20 clip-chamfer border-2 border-[#0055FF] shadow-[4px_4px_0px_#000]">
                          <PlayerAvatar playerName={match.playerB} charName={match.charB} playerType="B" />
                        </div>
                        <div className="flex flex-col items-end">
                          <h3 className="text-4xl font-black text-white drop-shadow-[4px_4px_0px_#000]" style={{ fontFamily: "var(--font-bebas)" }}>{match.playerB}</h3>
                          <p className="text-sm text-[#0055FF] font-black tracking-widest uppercase bg-black/50 px-2 self-end mt-1">Player B</p>
                        </div>
                      </div>
                    </div>

                    {/* The Absolute FGC Center "VS" */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black italic text-neutral-200 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] -skew-x-12 z-20 pointer-events-none">
                      {match.status === "SETTLED" && typeof match.scoreA === 'number' && typeof match.scoreB === 'number' ? (
                        <span
                          className="text-[#FFD700] drop-shadow-[4px_4px_0px_#000]"
                          style={{ fontFamily: "var(--font-bebas)", textShadow: "4px 4px 0 #000, 0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.4)" }}
                        >
                          {match.scoreA} - {match.scoreB}
                        </span>
                      ) : (
                        <span
                          className="text-[#D91616]"
                          style={{ fontFamily: "var(--font-bebas)", textShadow: "4px 4px 0 #000, 0 0 20px rgba(217, 22, 22, 0.8)" }}
                        >
                          VS
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Betting Area */}
                  {match.status === "OPEN" && (
                    <div className="bg-[#111] p-4 border-t-4 border-[#1a1a1a] relative z-20">

                      {/* Roman Cancel (Cancel Bet) */}
                      {match.bets?.some((b: any) => b.userId === userId) && (
                        <div className="mb-4">
                          <button
                            onClick={() => {
                              const userBet = match.bets?.find((b: any) => b.userId === userId);
                              if (userBet) handleCancelBet(userBet.amount);
                            }}
                            className="w-full py-2 bg-[#D91616]/20 border-2 border-[#D91616] text-[#ffffff] hover:bg-[#D91616]/80 font-black tracking-widest transition-all clip-chamfer transform -skew-x-12 hover:scale-[1.02]"
                            style={{ fontFamily: "var(--font-bebas)" }}
                          >
                            <span className="inline-block transform skew-x-12">[ 🔄 RC取消 (扣5%) ]</span>
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-center mb-3">
                        <label htmlFor={`bet-amount-${match.id}`} className="text-xs text-neutral-400 font-bold tracking-widest uppercase">投入分数 (Score) <span className="text-yellow-500 ml-2">
                            {(() => {
                              if (match.stageType === "GROUP") return `(下注限额: ${sysSettings.GROUP_MAX} W$)`;
                              if (match.stageType === "BRACKET") {
                                const currentLimit = Math.max(sysSettings.KO_MIN, Math.floor(points * (sysSettings.KO_PERCENT / 100)));
                                return `(下注限额: ${currentLimit} W$ (资产的 ${sysSettings.KO_PERCENT}%, 保底 ${sysSettings.KO_MIN}))`;
                              }
                              return "";
                            })()}
                          </span>
                        </label>
                        <div className="flex gap-2">
                          {[100, 500].map(amt => (
                            <button
                              key={amt}
                              onClick={() => setQuickAmount(amt)}
                              className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1 clip-chamfer font-mono focus:outline-none border border-neutral-700 focus:border-[#39FF14]"
                              aria-label={`快捷下注 ${amt} 积分`}
                            >
                              +{amt}
                            </button>
                          ))}
                          <button
                            onClick={() => setQuickAmount("ALL")}
                            className="text-xs bg-[#D91616]/20 hover:bg-[#D91616]/40 text-[#D91616] font-black px-3 py-1 clip-chamfer focus:outline-none border-2 border-[#D91616]"
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
                          if (match.stageType === "GROUP") return `输入注额... (最大 ${sysSettings.GROUP_MAX})`;
                          if (match.stageType === "BRACKET") return `输入注额... (最大 ${Math.max(sysSettings.KO_MIN, Math.floor(points * (sysSettings.KO_PERCENT / 100)))})`;
                          return "输入注额... (最大 500)";
                        })()}
                        className="w-full bg-[#0a0a0a] border border-[#333] border-b-[4px] border-b-[#555] p-3 text-white focus:outline-none focus:border-b-[#39FF14] font-mono text-center text-2xl mb-4 transition-all"
                      />

                      <input
                        type="text"
                        value={betComment}
                        onChange={(e) => setBetComment(e.target.value)}
                        placeholder="赛事分析 / 留言 (Optional Comment)..."
                        maxLength={50}
                        className="w-full bg-[#0a0a0a] border border-[#333] border-b-[2px] border-b-[#555] p-3 text-neutral-300 text-sm focus:outline-none focus:border-b-[#39FF14] mb-4 transition-all placeholder:text-neutral-600 font-mono"
                      />

                      <div className="flex gap-4">
                        <button
                          onClick={() => handleBet("A")}
                          disabled={isBetting || !betAmount}
                          className={`flex-1 py-4 clip-chamfer text-2xl tracking-widest relative overflow-hidden transition-all duration-100 ease-out border-none cursor-pointer transform -skew-x-12 ${isBetting || !betAmount ? 'opacity-50 cursor-not-allowed bg-neutral-800 text-neutral-500' : 'bg-[#D91616] text-white hover:scale-105 hover:bg-white hover:text-[#D91616]'}`}
                          style={{ fontFamily: "var(--font-bebas)" }}
                          aria-label={`押注选手 A: ${match.playerA}`}
                        >
                          <span className="inline-block transform skew-x-12">{isBetting ? "..." : (!betAmount ? "ENTER SCORE" : "BET P1")}</span>
                        </button>

                        <button
                          onClick={() => handleBet("B")}
                          disabled={isBetting || !betAmount}
                          className={`flex-1 py-4 clip-chamfer text-2xl tracking-widest relative overflow-hidden transition-all duration-100 ease-out border-none cursor-pointer transform -skew-x-12 ${isBetting || !betAmount ? 'opacity-50 cursor-not-allowed bg-neutral-800 text-neutral-500' : 'bg-[#0055FF] text-white hover:scale-105 hover:bg-white hover:text-[#0055FF]'}`}
                          style={{ fontFamily: "var(--font-bebas)" }}
                          aria-label={`押注选手 B: ${match.playerB}`}
                        >
                          <span className="inline-block transform skew-x-12">{isBetting ? "..." : (!betAmount ? "ENTER SCORE" : "BET P2")}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Comments & Bets Feed */}
                  <div className="mt-6 pt-4 border-t border-neutral-800/50">
                    <h4 className="text-xs font-bold text-neutral-500 tracking-widest uppercase mb-3 flex items-center gap-2">
                      <span>📡 弹幕 / 战况情报 (Intel Feed)</span>
                    </h4>

                    {(!match.bets || match.bets.length === 0) ? (
                      <div className="py-6 text-center text-xs text-neutral-600 font-mono border-2 border-dashed border-[#1a1a1a] bg-[#0a0a0a] clip-chamfer">
                        [ NO INTEL YET ]
                      </div>
                    ) : (
                      <div
                        className="space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent"
                        style={{ maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)" }}
                      >
                        {match.bets.map((bet: any) => {
                          const isRed = bet.choice === 'A';
                          const accentColor = isRed ? 'border-l-[#D91616] bg-gradient-to-r from-[#D91616]/20 to-transparent' : 'border-l-[#0055FF] bg-gradient-to-r from-[#0055FF]/20 to-transparent';
                          const textColor = isRed ? 'text-[#D91616]' : 'text-[#0055FF]';
                          const playerName = isRed ? match.playerA : match.playerB;

                          return (
                            <div key={bet.id} className={`clip-tab p-3 text-sm border-l-4 ${accentColor} border-y border-r border-[#1a1a1a]`}>
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
                                <span className="text-neutral-500 font-mono">- W$</span>
                                <span className="font-mono text-[#FFD700] font-black">{bet.amount}</span>
                                <span className="text-neutral-500 font-mono">-&gt;</span>
                                <span className={`font-black uppercase tracking-widest ${textColor}`}>{playerName}</span>
                              </div>

                              {bet.comment && (
                                <div className="mt-2 text-neutral-400 text-xs italic break-words relative">
                                  <div className={`absolute -left-2 top-0 bottom-0 w-1 ${isRed ? 'bg-[#D91616]' : 'bg-[#0055FF]'}`}></div>
                                  <p className="pl-2 font-mono">&gt; &quot;{bet.comment}&quot;</p>
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [sysSettings, setSysSettings] = useState<{ GROUP_MAX: number, KO_PERCENT: number, KO_MIN: number }>({
    GROUP_MAX: 300,
    KO_PERCENT: 50,
    KO_MIN: 200
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        const newSettings = { GROUP_MAX: 300, KO_PERCENT: 50, KO_MIN: 200 };
        data.forEach((s: any) => {
          if (s.key === "GROUP_MAX") newSettings.GROUP_MAX = parseInt(s.value, 10);
          if (s.key === "KO_PERCENT") newSettings.KO_PERCENT = parseInt(s.value, 10);
          if (s.key === "KO_MIN") newSettings.KO_MIN = parseInt(s.value, 10);
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

      if (!storedUserId) {
        router.push("/");
        return;
      }

      setUserId(storedUserId);
      setUsername(storedUsername || "Unknown");
      setDisplayName(storedDisplayName || storedUsername || "Unknown");
      setNewName(storedDisplayName || storedUsername || "Unknown");

      const initFetch = async () => {
        await fetchData(storedUserId);
        await fetchSettings();
        setIsInitialLoad(false);
      };

      initFetch();

      const intervalId = setInterval(() => {
        fetchMatches();
        fetchUserPoints(storedUserId);
        fetchLeaderboard();
        fetchSettings();
      }, 15000);

      return () => clearInterval(intervalId);
    }
  }, [router]);

  const fetchData = async (id: string = userId) => {
    setIsRefreshing(true);
    await Promise.all([fetchUserPoints(id), fetchMatches(), fetchLeaderboard()]);
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
    if (filter === "ALL") return matches;
    return matches.filter(m => m.status === filter);
  }, [matches, filter]);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-5xl mx-auto p-4 sm:p-8 relative">

        <div className="flex justify-between items-center mb-8 relative z-10 transform skew-x-2 min-h-[40px]">
          <div className="flex gap-4 items-center">
            {!isInitialLoad && points < 10 && (
              <button
                onClick={handleWelfare}
                className="ggst-button border-red-500 hover:bg-red-600 text-xs px-4 py-2 shadow-[2px_2px_0px_0px_rgba(239,68,68,0.8)] animate-pulse transform -skew-x-2"
              >
                ⚕️ FAUST 紧急救治 (领取 50 积分)
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
                className="bg-[#111111] border-4 border-red-600 border-t-[#39FF14] p-8 max-w-lg w-full shadow-[10px_10px_0px_rgba(239,68,68,0.5)] transform -skew-x-2 relative clip-modal"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 w-full">
          {/* Main Matches Area (Left) */}
          <div className="lg:col-span-2">
            {/* Balance Display & Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="bg-black/80 border-2 border-yellow-500 p-3 transform -skew-x-2 shadow-[4px_4px_0px_rgba(234,179,8,1)]">
                <span className="text-xl font-bold tracking-widest text-yellow-400 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                  当前余额: {points.toLocaleString()} W$
                </span>
              </div>
              <div className="flex bg-transparent">
              {(["OPEN", "SETTLED", "ALL"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-8 py-3 font-black tracking-widest transition-all focus-visible:outline-none transform -skew-x-12 clip-tab mx-[-5px] z-10 ${
                    filter === f
                      ? "bg-[#D91616] text-white scale-105 shadow-[0_0_15px_rgba(217,22,22,0.8)] relative z-20"
                      : "bg-[#111] text-neutral-500 hover:text-white hover:bg-[#222] border-2 border-[#1a1a1a]"
                  }`}
                  style={{ fontFamily: "var(--font-bebas)", fontSize: "1.5rem" }}
                  aria-pressed={filter === f}
                >
                  <span className="inline-block transform skew-x-12">{f === "OPEN" ? "LET'S ROCK" : f === "SETTLED" ? "SLASH!" : "ALL DATA"}</span>
                </button>
              ))}
              </div>
            </div>

            {/* Match List */}
            {filteredMatches.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-black/50 border-2 border-neutral-800 border-dashed backdrop-blur-sm relative z-10 transform -skew-x-2 w-full"
              >
                <p className="text-neutral-500 font-bold text-2xl tracking-widest">等待玩家投币挑战 (INSERT COIN...)</p>
              </motion.div>
            ) : (
              <motion.div className="grid grid-cols-1 xl:grid-cols-2 gap-8 relative z-10 w-full" layout>
            <AnimatePresence>
              {filteredMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  userId={userId}
                  points={points}
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
    </ProtectedRoute>
  );
}