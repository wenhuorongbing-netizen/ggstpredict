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
      if (localStorage.getItem("role") !== "ADMIN") return router.push("/");
      fetchMatches();
    }
  }, [router]);

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      if (res.ok) setMatches(await res.json());
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerA, playerB }),
      });

      if (!res.ok) {
        setError((await res.json()).error || "创建赛事失败");
      } else {
        setPlayerA(""); setPlayerB("");
        fetchMatches();
      }
    } catch (err) {
      setError("网络错误，请稍后再试");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSettleMatch = async (matchId: string, winner: "A" | "B", pName: string) => {
    setError(null);
    if (!confirm(`⚠️ 危险操作：确认结算比赛并判定 [ ${pName} ] 获胜吗？此操作不可逆，积分将立刻分发！`)) return;

    setSettlingMatchId(matchId);
    try {
      const res = await fetch("/api/matches/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, winner }),
      });

      if (!res.ok) setError((await res.json()).error || "结算失败");
      else fetchMatches();
    } catch (err) {
      setError("网络错误，请稍后再试");
    } finally {
      setSettlingMatchId(null);
    }
  };

  const activeMatches = matches.filter(m => m.status !== "SETTLED");
  const settledMatches = matches.filter(m => m.status === "SETTLED");

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-8 font-sans selection:bg-purple-500/30 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <header className="flex justify-between items-center py-6 border-b border-purple-900/30 mb-8 bg-neutral-900/50 px-6 rounded-2xl shadow-lg border-l-4 border-l-purple-500">
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 tracking-tight">OVERSEER PANEL</h1>
            <p className="text-neutral-500 text-xs mt-1 uppercase tracking-widest font-bold">System Administration</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none rounded-lg transition-all text-sm border border-neutral-700 text-neutral-300 font-bold hover:border-purple-500/50"
            aria-label="返回大厅"
          >
            返回大厅 ➔
          </button>
        </header>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-950/80 border-l-4 border-red-500 text-red-200 p-4 rounded-r-lg mb-6 flex justify-between items-center shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              role="alert"
            >
              <span className="font-mono text-sm tracking-wide">SYSTEM ERROR: {error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white p-1" aria-label="关闭提示">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Match Module */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xl mb-10 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
          <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
             <span className="text-purple-500">❖</span> 部署新赛事
          </h2>
          <form onSubmit={handleCreateMatch} className="flex flex-col md:flex-row gap-6 items-end relative z-10">
            <div className="flex-1 w-full group">
              <label htmlFor="playerA" className="block text-xs text-red-400/80 mb-2 font-bold tracking-widest uppercase">RED SIDE (Player A)</label>
              <input
                id="playerA"
                type="text"
                value={playerA}
                onChange={(e) => setPlayerA(e.target.value)}
                placeholder="Player A"
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 text-red-100 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500 transition-all font-medium placeholder:text-neutral-700"
                required
              />
            </div>

            <div className="text-neutral-600 font-black text-2xl italic pb-4 hidden md:block select-none pointer-events-none">VS</div>

            <div className="flex-1 w-full group">
              <label htmlFor="playerB" className="block text-xs text-blue-400/80 mb-2 font-bold tracking-widest uppercase">BLUE SIDE (Player B)</label>
              <input
                id="playerB"
                type="text"
                value={playerB}
                onChange={(e) => setPlayerB(e.target.value)}
                placeholder="Player B"
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 text-blue-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500 transition-all font-medium placeholder:text-neutral-700"
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isCreating}
              className="w-full md:w-48 p-4 bg-purple-600/20 hover:bg-purple-600/40 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none border border-purple-500/50 text-purple-300 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)] uppercase tracking-widest disabled:opacity-50"
              aria-label="部署新赛事"
            >
              {isCreating ? "Deploying..." : "Launch Match"}
            </motion.button>
          </form>
        </div>

        {/* Active Matches Section */}
        <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2 mt-12 relative z-10">
           <span className="text-yellow-500 animate-pulse">●</span> 待裁决赛事 (Active)
        </h2>
        {activeMatches.length === 0 ? (
          <div className="text-center py-16 bg-neutral-900/30 rounded-2xl border border-neutral-800/50 border-dashed text-neutral-600 font-mono text-sm relative z-10 backdrop-blur-sm">
             [ NO ACTIVE OPERATIONS ]
          </div>
        ) : (
          <div className="grid gap-4 mb-12 relative z-10">
            <AnimatePresence>
              {activeMatches.map((match) => (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center gap-6 transition-colors backdrop-blur-sm shadow-lg"
                >
                  <div className="flex items-center justify-center md:justify-start gap-4 w-full md:w-auto text-lg">
                    <span className="text-red-400 font-bold w-32 text-right truncate" title={match.playerA}>{match.playerA}</span>
                    <span className="text-neutral-700 font-black italic text-sm select-none">VS</span>
                    <span className="text-blue-400 font-bold w-32 text-left truncate" title={match.playerB}>{match.playerB}</span>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto bg-neutral-950 p-2 rounded-lg border border-neutral-800/80">
                    <button
                      onClick={() => handleSettleMatch(match.id, "A", match.playerA)}
                      disabled={settlingMatchId === match.id}
                      className="flex-1 px-4 py-2 bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none border border-red-900 hover:border-red-500 rounded-md transition-all font-bold text-sm tracking-wide disabled:opacity-50"
                      aria-label={`判定 ${match.playerA} (A) 胜`}
                    >
                      {settlingMatchId === match.id ? "..." : "A 胜"}
                    </button>
                    <button
                      onClick={() => handleSettleMatch(match.id, "B", match.playerB)}
                      disabled={settlingMatchId === match.id}
                      className="flex-1 px-4 py-2 bg-blue-950/40 hover:bg-blue-600 text-blue-400 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none border border-blue-900 hover:border-blue-500 rounded-md transition-all font-bold text-sm tracking-wide disabled:opacity-50"
                      aria-label={`判定 ${match.playerB} (B) 胜`}
                    >
                      {settlingMatchId === match.id ? "..." : "B 胜"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Settled Matches Section */}
        <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2 border-t border-neutral-800/50 pt-8 relative z-10">
           <span className="text-neutral-500">≡</span> 历史档案 (Settled)
        </h2>
        <motion.div className="grid gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300 relative z-10" layout>
          <AnimatePresence>
            {settledMatches.map((match) => (
              <motion.div
                key={match.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-neutral-900/30 border border-neutral-800/50 rounded-lg p-3 flex justify-between items-center text-sm backdrop-blur-sm"
              >
                <div className="font-medium">
                  <span className={match.winner === "A" ? "text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" : "text-neutral-500"}>{match.playerA}</span>
                  <span className="text-neutral-700 px-3 font-bold italic select-none">vs</span>
                  <span className={match.winner === "B" ? "text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" : "text-neutral-500"}>{match.playerB}</span>
                </div>
                <div className="text-neutral-400 font-mono text-xs bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
                  WINNER: <span className="text-yellow-500 font-bold ml-1">{match.winner === "A" ? match.playerA : match.playerB}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
}