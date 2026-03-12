"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  useEffect(() => {
    const role = localStorage.getItem("role");

    if (role !== "ADMIN") {
      router.push("/");
      return;
    }

    fetchMatches();
  }, [router]);

  const fetchMatches = async () => {
    try {
      // Fetch all matches for admin view
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
        alert("赛事创建成功！");
      }
    } catch (err) {
      console.error("Create match error:", err);
      setError("网络错误，请稍后再试");
    }
  };

  const handleSettleMatch = async (matchId: string, winner: "A" | "B") => {
    setError(null);
    if (!confirm(`确定要结算比赛并判定 ${winner} 获胜吗？此操作不可逆！`)) {
      return;
    }

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
        alert("赛事结算成功！");
      }
    } catch (err) {
      console.error("Settle match error:", err);
      setError("网络错误，请稍后再试");
    }
  };

  const activeMatches = matches.filter(m => m.status !== "SETTLED");
  const settledMatches = matches.filter(m => m.status === "SETTLED");

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center py-6 border-b border-neutral-800 mb-8">
          <h1 className="text-2xl font-bold text-red-500">管理员面板 (Admin Panel)</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors text-sm border border-neutral-700"
          >
            返回大厅
          </button>
        </header>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6">
            {error}
          </div>
        )}

        {/* Create Match Form */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg mb-10">
          <h2 className="text-xl font-semibold mb-6 border-b border-neutral-800 pb-2">创建新赛事</h2>
          <form onSubmit={handleCreateMatch} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm text-neutral-400 mb-2">Player A (红方)</label>
              <input
                type="text"
                value={playerA}
                onChange={(e) => setPlayerA(e.target.value)}
                placeholder="选手 A 名字"
                className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-red-500"
                required
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm text-neutral-400 mb-2">Player B (蓝方)</label>
              <input
                type="text"
                value={playerB}
                onChange={(e) => setPlayerB(e.target.value)}
                placeholder="选手 B 名字"
                className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-colors"
            >
              发起对决
            </button>
          </form>
        </div>

        {/* Active Matches for Settlement */}
        <h2 className="text-xl font-semibold mb-6 border-b border-neutral-800 pb-2">未结算赛事 (待判定)</h2>
        {activeMatches.length === 0 ? (
          <div className="text-center py-8 bg-neutral-900 rounded-xl border border-neutral-800 mb-10">
            <p className="text-neutral-500">当前没有待结算的比赛</p>
          </div>
        ) : (
          <div className="space-y-4 mb-10">
            {activeMatches.map((match) => (
              <div key={match.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-lg font-mono">
                  <span className="text-red-400">{match.playerA}</span> <span className="text-neutral-500 px-2">VS</span> <span className="text-blue-400">{match.playerB}</span>
                  <span className="ml-4 text-xs bg-neutral-800 px-2 py-1 rounded text-neutral-400">{match.status}</span>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <button
                    onClick={() => handleSettleMatch(match.id, "A")}
                    className="flex-1 md:flex-none px-4 py-2 bg-red-900/40 hover:bg-red-700 text-red-100 border border-red-800 rounded transition-colors"
                  >
                    判定 A 胜
                  </button>
                  <button
                    onClick={() => handleSettleMatch(match.id, "B")}
                    className="flex-1 md:flex-none px-4 py-2 bg-blue-900/40 hover:bg-blue-700 text-blue-100 border border-blue-800 rounded transition-colors"
                  >
                    判定 B 胜
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settled Matches (History) */}
        <h2 className="text-xl font-semibold mb-6 border-b border-neutral-800 pb-2">已结算赛事历史</h2>
        {settledMatches.length === 0 ? (
          <div className="text-center py-8 bg-neutral-900 rounded-xl border border-neutral-800">
            <p className="text-neutral-500">暂无结算记录</p>
          </div>
        ) : (
          <div className="space-y-4 opacity-70">
            {settledMatches.map((match) => (
              <div key={match.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex justify-between items-center">
                <div className="text-md">
                  <span className={match.winner === "A" ? "text-yellow-500 font-bold" : "text-neutral-400"}>{match.playerA}</span>
                  <span className="text-neutral-600 px-2">VS</span>
                  <span className={match.winner === "B" ? "text-yellow-500 font-bold" : "text-neutral-400"}>{match.playerB}</span>
                </div>
                <div className="text-sm font-mono text-neutral-400 bg-neutral-800 px-3 py-1 rounded">
                  胜者: {match.winner}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}