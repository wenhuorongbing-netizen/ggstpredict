"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import confetti from "canvas-confetti";

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
  bets?: Bet[];
}

interface LeaderboardEntry {
  id: string;
  displayName: string;
  points: number;
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
      fetchData(storedUserId);

      const intervalId = setInterval(() => {
        fetchMatches();
        fetchUserPoints(storedUserId);
        fetchLeaderboard();
      }, 10000);

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
      const res = await fetch("/api/users/leaderboard");
      if (res.ok) setLeaderboard(await res.json());
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

  const handleUpdateName = async () => {
    if (!newName.trim() || newName.trim() === displayName) {
      setIsEditingName(false);
      setNewName(displayName); // reset
      return;
    }

    try {
      const res = await fetch("/api/users/name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, displayName: newName }),
      });

      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.displayName);
        if (typeof window !== "undefined") {
          localStorage.setItem("displayName", data.displayName);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update name");
        setNewName(displayName); // reset on error
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
      setNewName(displayName);
    } finally {
      setIsEditingName(false);
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

  const setQuickAmount = (matchId: string, amt: number | "ALL") => {
    const finalAmt = amt === "ALL" ? points : amt;
    setBetAmount((prev) => ({ ...prev, [matchId]: finalAmt }));
  };

  const filteredMatches = useMemo(() => {
    if (filter === "ALL") return matches;
    return matches.filter(m => m.status === filter);
  }, [matches, filter]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-neutral-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black text-neutral-100 p-4 sm:p-8 font-sans selection:bg-red-500/30 overflow-x-hidden">
        <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-center py-6 border-b border-neutral-800/50 mb-8 gap-4 bg-neutral-900/20 px-6 rounded-2xl backdrop-blur-md shadow-lg relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <span className="text-red-500 font-black text-xl">P</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">预测战情中心</h1>
              <div className="text-neutral-400 mt-1 flex items-center gap-2 text-sm font-medium flex-wrap">
                代号:
                {isEditingName ? (
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={handleUpdateName}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdateName()}
                    maxLength={15}
                    autoFocus
                    className="bg-neutral-900 border border-neutral-700 text-red-400 px-2 py-0.5 rounded focus:outline-none focus:border-red-500 w-32"
                  />
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    {displayName}
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-neutral-500 hover:text-red-400 transition-colors ml-1"
                      aria-label="Edit Name"
                    >
                      ✎
                    </button>
                  </span>
                )}
                <span className="text-neutral-700">|</span>
                积分:
                <motion.span
                  key={points}
                  initial={{ scale: 1.5, color: "#fff" }}
                  animate={{ scale: 1, color: "#ef4444" }}
                  className="font-mono text-lg font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.5)] ml-1"
                >
                  {points.toLocaleString()}
                </motion.span>
                {points < 10 && (
                  <button
                    onClick={handleWelfare}
                    className="ml-4 ggst-button border-red-500 hover:bg-red-600 text-xs px-3 py-1 shadow-[2px_2px_0px_0px_rgba(239,68,68,0.8)] animate-pulse"
                  >
                    ⚕️ FAUST 紧急救治 (领取 50 积分)
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => fetchData()}
              disabled={isRefreshing}
              className="px-4 py-2 bg-neutral-800/50 hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-lg transition-all text-sm border border-neutral-700 text-neutral-300 flex items-center gap-2 font-medium"
              aria-label="刷新数据"
            >
              <motion.span
                animate={{ rotate: isRefreshing ? 360 : 0 }}
                transition={{ repeat: isRefreshing ? Infinity : 0, duration: 1, ease: "linear" }}
                className="inline-block"
              >
                ⟳
              </motion.span>
              刷新
            </button>
            <button
              onClick={() => setShowRules(true)}
              className="px-4 py-2 bg-blue-950/30 hover:bg-blue-900/50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none text-blue-400 rounded-lg transition-all text-sm border border-blue-900/50 font-bold tracking-widest"
              style={{ fontFamily: "var(--font-bebas)" }}
              aria-label="Rules"
            >
              RULES [?]
            </button>
            <button
              onClick={() => router.push("/bracket")}
              className="px-4 py-2 bg-purple-950/30 hover:bg-purple-900/50 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none text-purple-400 rounded-lg transition-all text-sm border border-purple-900/50 font-bold tracking-widest"
              style={{ fontFamily: "var(--font-bebas)" }}
              aria-label="Bracket"
            >
              🏆 STANDINGS
            </button>
            <button
              onClick={() => router.push("/docs")}
              className="px-4 py-2 bg-neutral-900/50 hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none text-neutral-300 rounded-lg transition-all text-sm border border-neutral-700 font-bold tracking-widest"
              style={{ fontFamily: "var(--font-bebas)" }}
              aria-label="Docs"
            >
              📚 DOCS
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-950/30 hover:bg-red-900/50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none text-red-400 rounded-lg transition-all text-sm border border-red-900/50 font-medium"
              aria-label="退出登录"
            >
              撤离
            </button>
          </div>
        </header>

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
                      <strong className="text-red-400 text-lg">🎯 基础规则</strong><br/>
                      选择你支持的选手投入积分。比赛状态为 LET'S ROCK 时可自由下注，状态变为 SLASH! 后结算。
                    </p>
                    <p>
                      <strong className="text-red-400 text-lg">💰 奖池瓜分</strong><br/>
                      本平台采用动态赔率：【胜者阵营】将按投入比例，平分【败者阵营】的所有积分！
                    </p>
                    <div className="bg-neutral-900 p-4 border-l-4 border-blue-500 font-mono text-xs">
                      <strong>📊 举个栗子:</strong><br/>
                      A池总共有 100 积分，B池总共有 200 积分。如果你给 A 投入了 10 积分。当 A 获胜时，你不仅拿回自己的 10 积分，还能分到 B池的 20 积分。
                    </div>
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

        <div className="flex flex-col xl:flex-row gap-8 mb-8 relative z-10">
          <div className="flex-1">
            {/* Filters */}
            <div className="flex gap-2 bg-[#000000] p-1.5 w-fit border-2 border-neutral-800 shadow-[4px_4px_0px_rgba(38,38,38,1)] transform -skew-x-2 mb-8">
              {(["OPEN", "SETTLED", "ALL"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-2 font-bold tracking-widest transition-all focus-visible:outline-none ${
                    filter === f
                      ? "bg-red-600 text-white shadow-[2px_2px_0px_rgba(239,68,68,0.5)] transform translate-x-[1px] translate-y-[1px]"
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

          {/* Leaderboard (Bounty Board) */}
          <div className="w-full xl:w-80 flex-shrink-0">
            <div className="bg-black/80 border-2 border-neutral-700 p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] transform -skew-x-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-yellow-500 pointer-events-none z-20"></div>
              <h3 className="text-xl font-bold text-white mb-4 tracking-widest transform skew-x-2 flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)" }}>
                <span className="text-yellow-500">🏆</span> WANTED FIGHTERS
              </h3>
              <div className="space-y-2 transform skew-x-2">
                {leaderboard.length === 0 ? (
                  <p className="text-neutral-500 text-xs font-mono">NO DATA YET...</p>
                ) : (
                  leaderboard.map((user, index) => {
                    const isTop3 = index < 3;
                    const rankText = index === 0 ? '1ST' : index === 1 ? '2ND' : index === 2 ? '3RD' : `${index + 1}TH`;
                    return (
                      <div key={user.id} className={`flex justify-between items-center text-sm font-mono p-2 border-l-2 ${isTop3 ? 'border-yellow-500 bg-yellow-900/10' : 'border-neutral-700 bg-neutral-900/30'}`}>
                        <div className="flex items-center gap-2 truncate">
                          <span className={`font-black w-8 ${isTop3 ? 'text-yellow-500' : 'text-neutral-500'}`}>{rankText}</span>
                          <span className={`truncate ${isTop3 ? 'text-white font-bold' : 'text-neutral-400'}`}>{user.displayName}</span>
                        </div>
                        <span className={`font-bold ml-2 shrink-0 ${isTop3 ? 'text-yellow-400' : 'text-neutral-500'}`}>
                          {user.points.toLocaleString()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Match List */}
        {filteredMatches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-black/50 border-2 border-neutral-800 border-dashed backdrop-blur-sm relative z-10 transform -skew-x-2"
          >
            <p className="text-neutral-500 font-bold text-2xl tracking-widest">等待玩家投币挑战 (INSERT COIN...)</p>
          </motion.div>
        ) : (
          <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10" layout>
            <AnimatePresence>
              {filteredMatches.map((match) => (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-black/80 border-2 relative overflow-hidden backdrop-blur-md transition-all duration-300 transform -skew-x-2 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] ${
                    match.status === "OPEN" ? "border-neutral-600 hover:border-red-500/50" : "border-neutral-800 opacity-80"
                  }`}
                >
                  {/* Settled Badge */}
                  {match.status === "SETTLED" && (
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black px-4 py-1 font-bold flex items-center shadow-[-4px_4px_0px_rgba(234,179,8,0.2)] z-20" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}>
                      WINNER: {match.winner}
                    </div>
                  )}

                  {/* Decorative Corner */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white pointer-events-none z-20"></div>

                  {/* Players Info */}
                  <div className="flex justify-between items-center mb-6 mt-8 relative px-6 transform skew-x-2">
                    {/* VS Divider */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none pointer-events-none z-10">
                      <span
                        className="text-red-500 font-black italic my-2 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                        style={{ fontFamily: "var(--font-bebas)", fontSize: "3rem", textShadow: "0 0 10px rgba(239, 68, 68, 0.8), 0 0 20px rgba(239, 68, 68, 0.4)" }}
                      >
                        VS
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center text-center relative z-10">
                      <div className="w-16 h-16 rounded-full border-2 bg-gradient-to-br from-red-600 to-red-900 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] mb-3 flex items-center justify-center overflow-hidden">
                        {match.charA ? (
                          <img
                            src={`/assets/characters/${match.charA.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`}
                            alt={match.charA}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback if image fails to load
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <span className={`text-2xl font-bold text-white drop-shadow-md ${match.charA ? 'hidden' : ''}`} style={{ fontFamily: "var(--font-bebas)" }}>
                          {match.playerA.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-3xl font-black mb-1 text-white drop-shadow-[3px_3px_0px_rgba(239,68,68,0.8)]" style={{ fontFamily: "var(--font-bebas)" }}>{match.playerA}</h3>
                      <p className="text-xs text-red-500 font-bold tracking-widest uppercase">Player A</p>
                    </div>

                    <div className="w-16"></div> {/* Spacer for VS */}

                    <div className="flex-1 flex flex-col items-center text-center relative z-10">
                      <div className="w-16 h-16 rounded-full border-2 bg-gradient-to-bl from-blue-600 to-blue-900 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] mb-3 flex items-center justify-center overflow-hidden">
                        {match.charB ? (
                          <img
                            src={`/assets/characters/${match.charB.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`}
                            alt={match.charB}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback if image fails to load
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <span className={`text-2xl font-bold text-white drop-shadow-md ${match.charB ? 'hidden' : ''}`} style={{ fontFamily: "var(--font-bebas)" }}>
                          {match.playerB.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-3xl font-black mb-1 text-white drop-shadow-[3px_3px_0px_rgba(59,130,246,0.8)]" style={{ fontFamily: "var(--font-bebas)" }}>{match.playerB}</h3>
                      <p className="text-xs text-blue-500 font-bold tracking-widest uppercase">Player B</p>
                    </div>
                  </div>

                  {/* Betting Area */}
                  {match.status === "OPEN" && (
                    <div className="bg-neutral-950/60 rounded-2xl p-4 border border-neutral-800/50 relative z-20">
                      <div className="flex justify-between items-center mb-3">
                        <label htmlFor={`bet-amount-${match.id}`} className="text-xs text-neutral-400 font-bold tracking-widest uppercase">投入分数 (Score)</label>
                        <div className="flex gap-2">
                          {[100, 500].map(amt => (
                            <button
                              key={amt}
                              onClick={() => setQuickAmount(match.id, amt)}
                              className="text-xs bg-neutral-800 hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none text-neutral-300 px-2 py-1 rounded transition-colors border border-neutral-700"
                              aria-label={`快捷下注 ${amt} 积分`}
                            >
                              +{amt}
                            </button>
                          ))}
                          <button
                            onClick={() => setQuickAmount(match.id, "ALL")}
                            className="text-xs bg-red-900/40 hover:bg-red-800/60 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none text-red-400 px-2 py-1 rounded transition-colors border border-red-900/50 font-bold"
                            aria-label="全押"
                          >
                            梭哈 (ALL IN)
                          </button>
                        </div>
                      </div>

                      <input
                        id={`bet-amount-${match.id}`}
                        type="number"
                        min="0"
                        value={betAmount[match.id] || ""}
                        onChange={(e) => setBetAmount((prev) => ({ ...prev, [match.id]: parseInt(e.target.value) || 0 }))}
                        placeholder="输入注额..."
                        className="w-full bg-neutral-900 border border-neutral-700/50 rounded-xl p-3 text-white focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 font-mono text-center text-lg mb-4 transition-all"
                      />

                      <input
                        type="text"
                        value={betComment[match.id] || ""}
                        onChange={(e) => setBetComment((prev) => ({ ...prev, [match.id]: e.target.value }))}
                        placeholder="赛事分析 / 留言 (Optional Comment)..."
                        maxLength={50}
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl p-3 text-neutral-300 text-sm focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 mb-4 transition-all placeholder:text-neutral-600"
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleBet(match.id, "A")}
                          disabled={isBetting[match.id] || !betAmount[match.id]}
                          className="flex-1 py-3 ggst-button border-red-500 hover:bg-red-600 focus-visible:outline-none"
                          style={{ boxShadow: "4px 4px 0px 0px rgba(239, 68, 68, 0.8)", fontSize: "1.2rem" }}
                          aria-label={`押注选手 A: ${match.playerA}`}
                        >
                          {isBetting[match.id] ? "..." : (!betAmount[match.id] ? "请输入分数 (Enter Score)" : "押注 A")}
                        </button>

                        <button
                          onClick={() => handleBet(match.id, "B")}
                          disabled={isBetting[match.id] || !betAmount[match.id]}
                          className="flex-1 py-3 ggst-button border-blue-500 hover:bg-blue-600 focus-visible:outline-none"
                          style={{ boxShadow: "4px 4px 0px 0px rgba(59, 130, 246, 0.8)", fontSize: "1.2rem" }}
                          aria-label={`押注选手 B: ${match.playerB}`}
                        >
                          {isBetting[match.id] ? "..." : (!betAmount[match.id] ? "请输入分数 (Enter Score)" : "押注 B")}
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
                      <div className="py-6 text-center text-xs text-neutral-600 font-mono border border-dashed border-neutral-800/50 rounded-xl bg-neutral-900/20">
                        No intel yet. Be the first to analyze this matchup.
                      </div>
                    ) : (
                      <div
                        className="space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent"
                        style={{ maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)" }}
                      >
                        {match.bets.map(bet => {
                          const isRed = bet.choice === 'A';
                          const accentColor = isRed ? 'border-l-red-500 bg-gradient-to-r from-red-950/30 to-transparent' : 'border-l-blue-500 bg-gradient-to-r from-blue-950/30 to-transparent';
                          const textColor = isRed ? 'text-red-400' : 'text-blue-400';
                          const playerName = isRed ? match.playerA : match.playerB;

                          return (
                            <div key={bet.id} className={`rounded-r-lg p-3 text-sm border-l-2 ${accentColor} border-y border-r border-neutral-800/30`}>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-300">
                                <span className="font-black text-white">{bet.user.username}</span>
                                <span className="text-neutral-500">投入了</span>
                                <span className="font-mono text-yellow-500/90 font-bold">{bet.amount} 积分</span>
                                <span className="text-neutral-500">支持</span>
                                <span className={`font-bold ${textColor}`}>{playerName}</span>
                              </div>

                              {bet.comment && (
                                <div className="mt-2 text-neutral-400 text-xs italic break-words relative">
                                  <div className={`absolute -left-2 top-0 bottom-0 w-0.5 rounded ${isRed ? 'bg-red-900/50' : 'bg-blue-900/50'}`}></div>
                                  <p className="pl-2">"{bet.comment}"</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}