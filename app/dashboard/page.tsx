"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Match {
  id: string;
  playerA: string;
  playerB: string;
  status: string;
  winner?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [betAmount, setBetAmount] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isBetting, setIsBetting] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"OPEN" | "ALL" | "SETTLED">("OPEN");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserId = localStorage.getItem("userId");
      const storedUsername = localStorage.getItem("username");

      if (!storedUserId) {
        router.push("/");
        return;
      }

      setUserId(storedUserId);
      setUsername(storedUsername || "Unknown");
      fetchData(storedUserId);
    }
  }, [router]);

  const fetchData = async (id: string = userId) => {
    setIsRefreshing(true);
    await Promise.all([fetchUserPoints(id), fetchMatches()]);
    setTimeout(() => setIsRefreshing(false), 500); // Minimum animation time
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

  const handleBet = async (matchId: string, choice: "A" | "B") => {
    setError(null);
    const amount = betAmount[matchId] || 0;

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
        body: JSON.stringify({ userId, matchId, choice, amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Rollback on failure
        setPoints(previousPoints);
        setError(data.error || "下注失败");
      } else {
        // Sync with server on success
        fetchUserPoints(userId);
        setBetAmount((prev) => ({ ...prev, [matchId]: 0 }));
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black text-neutral-100 p-4 sm:p-8 font-sans selection:bg-red-500/30 overflow-x-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-center py-6 border-b border-neutral-800/50 mb-8 gap-4 bg-neutral-900/20 px-6 rounded-2xl backdrop-blur-md shadow-lg relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <span className="text-red-500 font-black text-xl">P</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">预测战情中心</h1>
              <p className="text-neutral-400 mt-1 flex items-center gap-2 text-sm font-medium">
                代号: <span className="text-red-400">{username}</span>
                <span className="text-neutral-700">|</span>
                武装积分:
                <motion.span
                  key={points}
                  initial={{ scale: 1.5, color: "#fff" }}
                  animate={{ scale: 1, color: "#ef4444" }}
                  className="font-mono text-lg font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]"
                >
                  {points.toLocaleString()}
                </motion.span>
              </p>
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
              onClick={handleLogout}
              className="px-4 py-2 bg-red-950/30 hover:bg-red-900/50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none text-red-400 rounded-lg transition-all text-sm border border-red-900/50 font-medium"
              aria-label="退出登录"
            >
              撤离
            </button>
          </div>
        </header>

        {/* Error Notification */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6 relative z-10"
            >
              <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center justify-between backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.15)]" role="alert">
                <span className="font-medium flex items-center gap-2">⚠️ {error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-white transition-colors p-1" aria-label="关闭提示">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex gap-2 mb-8 bg-neutral-900/60 p-1.5 rounded-xl w-fit border border-neutral-800/80 backdrop-blur-sm shadow-inner relative z-10">
          {(["OPEN", "SETTLED", "ALL"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none ${
                filter === f
                  ? "bg-neutral-700/80 text-white shadow-md scale-100"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 scale-95"
              }`}
              aria-pressed={filter === f}
            >
              {f === "OPEN" ? "🟢 开放下注" : f === "SETTLED" ? "🏁 已结算" : "📋 全部档案"}
            </button>
          ))}
        </div>

        {/* Match List */}
        {filteredMatches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-neutral-900/20 rounded-3xl border border-neutral-800/50 border-dashed backdrop-blur-sm relative z-10"
          >
            <p className="text-neutral-600 font-bold text-lg tracking-widest">NO ACTIVE DATA</p>
          </motion.div>
        ) : (
          <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10" layout>
            <AnimatePresence>
              {filteredMatches.map((match) => (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-neutral-900/40 border rounded-3xl p-6 relative overflow-hidden backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                    match.status === "OPEN" ? "border-neutral-700/50 hover:border-neutral-500/50" : "border-neutral-800/50 opacity-70"
                  }`}
                >
                  {/* Settled Badge */}
                  {match.status === "SETTLED" && (
                    <div className="absolute top-4 right-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500/90 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(234,179,8,0.1)] z-20">
                      🏆 胜者: {match.winner}
                    </div>
                  )}

                  {/* Players Info */}
                  <div className="flex justify-between items-center mb-6 mt-4 relative">
                    {/* VS Divider */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none pointer-events-none">
                      <div className="h-8 w-px bg-gradient-to-b from-transparent via-neutral-500 to-transparent"></div>
                      <span className="text-neutral-500 font-black text-xl italic my-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">VS</span>
                      <div className="h-8 w-px bg-gradient-to-b from-transparent via-neutral-500 to-transparent"></div>
                    </div>

                    <div className="flex-1 text-center relative z-10">
                      <h3 className="text-2xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">{match.playerA}</h3>
                      <p className="text-xs text-red-500/50 font-mono tracking-widest uppercase">Player A</p>
                    </div>

                    <div className="w-16"></div> {/* Spacer for VS */}

                    <div className="flex-1 text-center relative z-10">
                      <h3 className="text-2xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-blue-600 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">{match.playerB}</h3>
                      <p className="text-xs text-blue-500/50 font-mono tracking-widest uppercase">Player B</p>
                    </div>
                  </div>

                  {/* Betting Area */}
                  {match.status === "OPEN" && (
                    <div className="bg-neutral-950/60 rounded-2xl p-4 border border-neutral-800/50 relative z-20">
                      <div className="flex justify-between items-center mb-3">
                        <label htmlFor={`bet-amount-${match.id}`} className="text-xs text-neutral-400 font-bold tracking-widest uppercase">投入兵力 (Points)</label>
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
                            ALL IN
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

                      <div className="flex gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleBet(match.id, "A")}
                          disabled={isBetting[match.id] || !betAmount[match.id]}
                          className="flex-1 py-3 bg-gradient-to-r from-red-600/20 to-red-500/10 hover:from-red-600/40 hover:to-red-500/20 disabled:opacity-50 border border-red-500/30 text-red-400 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none flex items-center justify-center gap-2"
                          aria-label={`押注选手 A: ${match.playerA}`}
                        >
                          {isBetting[match.id] ? <span className="animate-spin inline-block">⚙</span> : "押注 A"}
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleBet(match.id, "B")}
                          disabled={isBetting[match.id] || !betAmount[match.id]}
                          className="flex-1 py-3 bg-gradient-to-l from-blue-600/20 to-blue-500/10 hover:from-blue-600/40 hover:to-blue-500/20 disabled:opacity-50 border border-blue-500/30 text-blue-400 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none flex items-center justify-center gap-2"
                          aria-label={`押注选手 B: ${match.playerB}`}
                        >
                          {isBetting[match.id] ? <span className="animate-spin inline-block">⚙</span> : "押注 B"}
                        </motion.button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}