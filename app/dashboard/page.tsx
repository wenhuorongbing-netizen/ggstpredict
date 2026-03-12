"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Match {
  id: string;
  playerA: string;
  playerB: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [betAmount, setBetAmount] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedUsername = localStorage.getItem("username");

    if (!storedUserId) {
      router.push("/");
      return;
    }

    setUserId(storedUserId);
    setUsername(storedUsername || "Unknown");

    // Fetch user points to ensure it's up to date
    fetchUserPoints(storedUserId);
    fetchMatches();
  }, [router]);

  const fetchUserPoints = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPoints(data.points);
        localStorage.setItem("points", data.points.toString());
      }
    } catch (err) {
      console.error("Failed to fetch user points", err);
    }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches?status=OPEN");
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (err) {
      console.error("Failed to fetch matches", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  const handleBet = async (matchId: string, choice: "A" | "B") => {
    setError(null);
    const amount = betAmount[matchId] || 0;

    if (amount <= 0) {
      setError("下注金额必须大于0");
      return;
    }

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
        setError(data.error || "下注失败");
      } else {
        // Refresh points after successful bet
        fetchUserPoints(userId);
        // Clear amount for this match
        setBetAmount({ ...betAmount, [matchId]: 0 });
        alert("下注成功！");
      }
    } catch (err) {
      console.error("Bet error:", err);
      setError("网络错误，请稍后再试");
    }
  };

  const handleAmountChange = (matchId: string, val: string) => {
    setBetAmount({
      ...betAmount,
      [matchId]: parseInt(val) || 0,
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center py-6 border-b border-neutral-800 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-red-500">预测大厅</h1>
            <p className="text-neutral-400 mt-1">代号: <span className="text-white">{username}</span> | 积分: <span className="text-red-400 font-mono text-lg">{points}</span></p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors text-sm border border-neutral-700"
          >
            退出登录
          </button>
        </header>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6">
            {error}
          </div>
        )}

        <h2 className="text-xl font-semibold mb-6">进行中的赛事 (OPEN)</h2>

        {matches.length === 0 ? (
          <div className="text-center py-12 bg-neutral-900 rounded-xl border border-neutral-800">
            <p className="text-neutral-500">当前没有可下注的比赛</p>
          </div>
        ) : (
          <div className="space-y-6">
            {matches.map((match) => (
              <div key={match.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex-1 flex justify-center items-center gap-4 w-full">
                    <div className="text-center flex-1">
                      <div className="text-xl font-bold mb-3">{match.playerA}</div>
                      <button
                        onClick={() => handleBet(match.id, "A")}
                        className="w-full py-2 px-4 bg-red-600/20 hover:bg-red-600 border border-red-600/50 hover:border-red-500 rounded text-red-100 transition-all"
                      >
                        押注 A
                      </button>
                    </div>

                    <div className="text-red-500 font-black text-2xl italic">VS</div>

                    <div className="text-center flex-1">
                      <div className="text-xl font-bold mb-3">{match.playerB}</div>
                      <button
                        onClick={() => handleBet(match.id, "B")}
                        className="w-full py-2 px-4 bg-blue-600/20 hover:bg-blue-600 border border-blue-600/50 hover:border-blue-500 rounded text-blue-100 transition-all"
                      >
                        押注 B
                      </button>
                    </div>
                  </div>

                  <div className="w-full md:w-48">
                    <label className="block text-xs text-neutral-400 mb-2 uppercase tracking-wider">下注金额</label>
                    <input
                      type="number"
                      min="0"
                      value={betAmount[match.id] || ""}
                      onChange={(e) => handleAmountChange(match.id, e.target.value)}
                      placeholder="输入积分..."
                      className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}