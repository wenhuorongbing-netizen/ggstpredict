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

  useEffect(() => {
    // Only access localStorage on the client
    if (typeof window !== "undefined") {
      const storedUserId = localStorage.getItem("userId");
      const storedUsername = localStorage.getItem("username");

      if (!storedUserId) {
        router.push("/");
        return;
      }

      setUserId(storedUserId);
      setUsername(storedUsername || "Unknown");

      fetchUserPoints(storedUserId);
      fetchMatches();
    }
  }, [router]);

  const fetchUserPoints = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPoints(data.points);
        if (typeof window !== "undefined") {
            localStorage.setItem("points", data.points.toString());
        }
      }
    } catch (err) {
      console.error("Failed to fetch user points", err);
    }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (err) {
      console.error("Failed to fetch matches", err);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
        localStorage.clear();
    }
    router.push("/");
  };

  const handleBet = async (matchId: string, choice: "A" | "B") => {
    setError(null);
    const amount = betAmount[matchId] || 0;

    if (amount <= 0) {
      setError("下注金额必须大于0");
      return;
    }

    if (amount > points) {
       setError("积分不足");
       return;
    }

    // Optimistic UI update
    const previousPoints = points;
    setPoints((prev) => prev - amount);
    setIsBetting((prev) => ({ ...prev, [matchId]: true }));

    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          matchId,
          choice,
          amount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Rollback
        setPoints(previousPoints);
        setError(data.error || "下注失败");
      } else {
        // Success: sync from server to ensure perfect consistency
        fetchUserPoints(userId);
        setBetAmount((prev) => ({ ...prev, [matchId]: 0 }));
      }
    } catch (err) {
      console.error("Bet error:", err);
      // Rollback
      setPoints(previousPoints);
      setError("网络错误，请稍后再试");
    } finally {
      setIsBetting((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  const handleAmountChange = (matchId: string, val: string) => {
    setBetAmount((prev) => ({
      ...prev,
      [matchId]: parseInt(val) || 0,
    }));
  };

  const filteredMatches = useMemo(() => {
    if (filter === "ALL") return matches;
    return matches.filter(m => m.status === filter);
  }, [matches, filter]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 font-sans selection:bg-red-500/30">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 border-b border-neutral-800 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-red-500 tracking-tight">预测大厅</h1>
            <p className="text-neutral-400 mt-1 flex items-center gap-2 text-sm">
              <span>代号: <span className="text-neutral-200 font-medium">{username}</span></span>
              <span className="text-neutral-600">|</span>
              <span>积分:
                <motion.span
                  key={points}
                  initial={{ scale: 1.2, color: "#ef4444" }}
                  animate={{ scale: 1, color: "#f87171" }}
                  className="font-mono text-lg ml-1"
                >
                  {points}
                </motion.span>
              </span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-lg transition-all text-sm border border-neutral-700 font-medium"
            aria-label="退出登录"
          >
            退出登录
          </button>
        </header>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-950/50 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 flex items-center justify-between"
              role="alert"
            >
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200" aria-label="关闭错误提示">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex gap-2 mb-8 bg-neutral-900/50 p-1 rounded-lg w-fit border border-neutral-800/50">
          {(["OPEN", "SETTLED", "ALL"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none ${
                filter === f
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
              }`}
              aria-pressed={filter === f}
            >
              {f === "OPEN" ? "进行中" : f === "SETTLED" ? "已结算" : "全部赛事"}
            </button>
          ))}
        </div>

        {filteredMatches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-neutral-900/30 rounded-2xl border border-neutral-800/50 backdrop-blur-sm"
          >
            <p className="text-neutral-500 font-medium">当前分类下没有赛事</p>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-6"
            layout
          >
            <AnimatePresence>
              {filteredMatches.map((match) => (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group"
                >
                   {match.status === "SETTLED" && (
                    <div className="absolute top-0 right-0 bg-neutral-800 text-neutral-400 text-xs px-3 py-1 rounded-bl-lg font-medium tracking-wide">
                      已结算 - 胜者: {match.winner}
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex-1 flex justify-center items-center gap-4 w-full">
                      <div className="text-center flex-1">
                        <div className="text-xl font-bold mb-4 text-neutral-100">{match.playerA}</div>
                        {match.status === "OPEN" && (
                            <button
                            onClick={() => handleBet(match.id, "A")}
                            disabled={isBetting[match.id] || betAmount[match.id] <= 0}
                            className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30 hover:border-red-500/60 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-lg text-red-400 font-medium transition-all"
                            aria-label={`押注选手 A: ${match.playerA}`}
                            >
                            {isBetting[match.id] ? "提交中..." : "押注 A"}
                            </button>
                        )}
                      </div>

                      <div className="text-neutral-600 font-black text-2xl italic select-none">VS</div>

                      <div className="text-center flex-1">
                        <div className="text-xl font-bold mb-4 text-neutral-100">{match.playerB}</div>
                        {match.status === "OPEN" && (
                            <button
                            onClick={() => handleBet(match.id, "B")}
                            disabled={isBetting[match.id] || betAmount[match.id] <= 0}
                            className="w-full py-2.5 px-4 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/30 hover:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-lg text-blue-400 font-medium transition-all"
                            aria-label={`押注选手 B: ${match.playerB}`}
                            >
                            {isBetting[match.id] ? "提交中..." : "押注 B"}
                            </button>
                        )}
                      </div>
                    </div>

                    {match.status === "OPEN" && (
                      <div className="w-full md:w-56 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/50">
                        <label htmlFor={`bet-${match.id}`} className="block text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">
                          投入积分
                        </label>
                        <input
                          id={`bet-${match.id}`}
                          type="number"
                          min="0"
                          value={betAmount[match.id] || ""}
                          onChange={(e) => handleAmountChange(match.id, e.target.value)}
                          placeholder="输入金额..."
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono transition-all placeholder:text-neutral-600"
                        />
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
  );
}