"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Match {
  id: string;
  playerA: string;
  playerB: string;
  status: string;
  winner: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [settlingMatchId, setSettlingMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("role");

      if (role !== "ADMIN") {
        router.push("/");
        return;
      }

      fetchMatches();
    }
  }, [router]);

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

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerA,
          playerB,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "创建赛事失败");
      } else {
        setPlayerA("");
        setPlayerB("");
        fetchMatches();
      }
    } catch (err) {
      console.error("Create match error:", err);
      setError("网络错误，请稍后再试");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSettleMatch = async (matchId: string, winner: "A" | "B") => {
    setError(null);
    if (!confirm(`确定要结算比赛并判定 ${winner} 获胜吗？此操作不可逆！`)) {
      return;
    }

    setSettlingMatchId(matchId);

    try {
      const res = await fetch("/api/matches/settle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId,
          winner,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "结算失败");
      } else {
        fetchMatches();
      }
    } catch (err) {
      console.error("Settle match error:", err);
      setError("网络错误，请稍后再试");
    } finally {
      setSettlingMatchId(null);
    }
  };

  const activeMatches = matches.filter(m => m.status !== "SETTLED");
  const settledMatches = matches.filter(m => m.status === "SETTLED");

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 font-sans selection:bg-red-500/30">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 border-b border-neutral-800 mb-8 gap-4">
          <h1 className="text-3xl font-bold text-red-500 tracking-tight">管理员面板 (Admin Panel)</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-lg transition-all text-sm border border-neutral-700 font-medium"
            aria-label="返回大厅"
          >
            返回大厅
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

        {/* Create Match Form */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-xl mb-10 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-6 border-b border-neutral-800/50 pb-3 text-neutral-200">创建新赛事</h2>
          <form onSubmit={handleCreateMatch} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label htmlFor="playerA" className="block text-sm text-neutral-400 mb-2 font-medium">Player A (红方)</label>
              <input
                id="playerA"
                type="text"
                value={playerA}
                onChange={(e) => setPlayerA(e.target.value)}
                placeholder="选手 A 名字"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-neutral-600"
                required
              />
            </div>
            <div className="flex-1 w-full">
              <label htmlFor="playerB" className="block text-sm text-neutral-400 mb-2 font-medium">Player B (蓝方)</label>
              <input
                id="playerB"
                type="text"
                value={playerB}
                onChange={(e) => setPlayerB(e.target.value)}
                placeholder="选手 B 名字"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-neutral-600"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className="w-full md:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
              aria-label="发起对决"
            >
              {isCreating ? "创建中..." : "发起对决"}
            </button>
          </form>
        </div>

        {/* Active Matches for Settlement */}
        <h2 className="text-xl font-semibold mb-6 border-b border-neutral-800/50 pb-3 text-neutral-200">未结算赛事 (待判定)</h2>
        {activeMatches.length === 0 ? (
          <div className="text-center py-12 bg-neutral-900/30 rounded-2xl border border-neutral-800/50 mb-10 backdrop-blur-sm">
            <p className="text-neutral-500 font-medium">当前没有待结算的比赛</p>
          </div>
        ) : (
          <motion.div className="space-y-4 mb-10" layout>
            <AnimatePresence>
              {activeMatches.map((match) => (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6"
                >
                  <div className="text-lg font-mono w-full md:w-auto text-center md:text-left">
                    <span className="text-red-400 font-semibold">{match.playerA}</span>
                    <span className="text-neutral-600 px-3 italic font-black">VS</span>
                    <span className="text-blue-400 font-semibold">{match.playerB}</span>
                    <span className="ml-4 mt-2 md:mt-0 inline-block text-xs bg-neutral-800/80 px-2.5 py-1 rounded-md text-neutral-400 border border-neutral-700/50">{match.status}</span>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button
                      onClick={() => handleSettleMatch(match.id, "A")}
                      disabled={settlingMatchId === match.id}
                      className="flex-1 md:flex-none px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none text-red-300 border border-red-500/30 hover:border-red-500/60 rounded-lg transition-all font-medium"
                      aria-label={`判定 ${match.playerA} (A) 胜`}
                    >
                      {settlingMatchId === match.id ? "..." : "判定 A 胜"}
                    </button>
                    <button
                      onClick={() => handleSettleMatch(match.id, "B")}
                      disabled={settlingMatchId === match.id}
                      className="flex-1 md:flex-none px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none text-blue-300 border border-blue-500/30 hover:border-blue-500/60 rounded-lg transition-all font-medium"
                      aria-label={`判定 ${match.playerB} (B) 胜`}
                    >
                      {settlingMatchId === match.id ? "..." : "判定 B 胜"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Settled Matches (History) */}
        <h2 className="text-xl font-semibold mb-6 border-b border-neutral-800/50 pb-3 text-neutral-200">已结算赛事历史</h2>
        {settledMatches.length === 0 ? (
          <div className="text-center py-12 bg-neutral-900/30 rounded-2xl border border-neutral-800/50 backdrop-blur-sm">
            <p className="text-neutral-500 font-medium">暂无结算记录</p>
          </div>
        ) : (
          <motion.div className="space-y-3 opacity-80" layout>
            <AnimatePresence>
              {settledMatches.map((match) => (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-neutral-900/50 border border-neutral-800/80 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3 hover:bg-neutral-900/80 transition-colors"
                >
                  <div className="text-md font-medium">
                    <span className={match.winner === "A" ? "text-yellow-500/90 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]" : "text-neutral-500"}>{match.playerA}</span>
                    <span className="text-neutral-700 px-3 italic font-bold">VS</span>
                    <span className={match.winner === "B" ? "text-yellow-500/90 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]" : "text-neutral-500"}>{match.playerB}</span>
                  </div>
                  <div className="text-xs font-mono text-neutral-300 bg-neutral-800/80 px-3 py-1.5 rounded-md border border-neutral-700/50 shadow-inner">
                    胜者: <span className="text-yellow-500/90 font-bold ml-1">{match.winner}</span>
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