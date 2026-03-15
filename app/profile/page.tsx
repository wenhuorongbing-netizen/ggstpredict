"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import PlayerAvatar from "@/components/PlayerAvatar";
import { motion } from "framer-motion";

interface Match {
  id: string;
  playerA: string;
  playerB: string;
  charA?: string | null;
  charB?: string | null;
  status: string;
  winner?: string | null;
}

interface Bet {
  id: string;
  amount: number;
  betOn: "A" | "B";
  createdAt: string;
  match: Match;
  profit: number; // if settled and won, it includes wager + profit - tax. Wait, profit here might just be profit. We'll show wager and profit appropriately.
}

interface UserProfile {
  id: string;
  displayName: string;
  points: number;
  winStreak: number;
  bets: Bet[];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/users/profile", {
        headers: {
          "x-user-id": userId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex h-screen items-center justify-center">
            <div className="text-red-500 animate-spin text-6xl">⚙</div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (!profile) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex h-screen items-center justify-center text-red-500 text-2xl font-black tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
            PROFILE NOT FOUND
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="p-4 sm:p-8 max-w-6xl mx-auto h-full flex flex-col gap-8">

          {/* Top Section */}
          <motion.div
            className="bg-black/80 border-2 border-neutral-700 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] p-6 transform -skew-x-2 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-600 pointer-events-none z-20"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-600 pointer-events-none z-20"></div>

            <div className="flex flex-col md:flex-row items-center gap-8 transform skew-x-2 relative z-10">
              <div className="w-32 h-32 flex-shrink-0">
                <PlayerAvatar playerName={profile.displayName} playerType="A" />
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-5xl font-black text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)] mb-2 uppercase" style={{ fontFamily: "var(--font-bebas)" }}>
                  {profile.displayName}
                </h1>
                <div className="text-neutral-400 font-bold tracking-widest text-sm uppercase mb-4" style={{ fontFamily: "var(--font-bebas)" }}>
                  HUNTER ID: {profile.id}
                </div>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="bg-neutral-900 border border-neutral-700 p-3 rounded flex items-center gap-3">
                    <span className="text-neutral-500 font-bold text-xs tracking-widest">积分 (W$)</span>
                    <span className="text-yellow-500 font-black text-2xl tracking-widest">{profile.points.toLocaleString()}</span>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-700 p-3 rounded flex items-center gap-3">
                    <span className="text-neutral-500 font-bold text-xs tracking-widest">连胜 (STREAK)</span>
                    <span className="text-red-500 font-black text-2xl tracking-widest flex items-center gap-2">
                      {profile.winStreak}
                      {profile.winStreak > 0 && <span className="animate-pulse">🔥</span>}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* History Section */}
          <motion.div
            className="bg-black/80 border-2 border-neutral-700 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] transform -skew-x-2 relative flex-1 flex flex-col min-h-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-neutral-900 p-4 border-b-2 border-neutral-800">
              <h2 className="text-3xl font-black text-white tracking-widest transform skew-x-2 drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                BOUNTY LEDGER (投注历史)
              </h2>
            </div>

            <div className="p-4 transform skew-x-2 flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-red-950/30 text-red-500 border-b border-red-900 font-bold tracking-widest text-sm uppercase" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}>
                    <th className="p-4">赛事 (Match)</th>
                    <th className="p-4">押注 (Bet on)</th>
                    <th className="p-4 text-right">投入 (Amount)</th>
                    <th className="p-4 text-right">状态 (Status/Result)</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  {profile.bets.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-neutral-600 font-bold tracking-widest text-xl" style={{ fontFamily: "var(--font-bebas)" }}>
                        NO RECORDS FOUND. START BETTING!
                      </td>
                    </tr>
                  ) : (
                    profile.bets.map((bet) => {
                      const m = bet.match;
                      const betOnName = bet.betOn === "A" ? m.playerA : m.playerB;
                      const isPending = m.status === "OPEN" || m.status === "LOCKED";
                      const isWinner = m.status === "SETTLED" && m.winner === bet.betOn;
                      const isLoser = m.status === "SETTLED" && m.winner && m.winner !== bet.betOn;
                      const isCanceled = m.status === "CANCELED";

                      return (
                        <tr key={bet.id} className="border-b border-neutral-800 text-neutral-300 hover:bg-neutral-900/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={m.winner === 'A' ? 'text-yellow-500 font-bold' : ''}>{m.playerA}</span>
                              <span className="text-neutral-600 text-[10px] mx-1">vs</span>
                              <span className={m.winner === 'B' ? 'text-yellow-500 font-bold' : ''}>{m.playerB}</span>
                            </div>
                            <div className="text-[10px] text-neutral-600 mt-1">
                              {new Date(bet.createdAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="p-4 font-bold text-white">
                            {betOnName}
                          </td>
                          <td className="p-4 text-right text-yellow-500 font-black tracking-widest">
                            {bet.amount.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-black tracking-widest">
                            {isPending && <span className="text-neutral-500">等待结算 (Pending)</span>}
                            {isWinner && <span className="text-green-500">+ {bet.profit.toLocaleString()} W$</span>}
                            {isLoser && <span className="text-red-500">- {bet.amount.toLocaleString()} W$</span>}
                            {isCanceled && <span className="text-neutral-500">已取消 (Canceled)</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
