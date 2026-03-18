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
  nameColor: string;
  points: number;
  winStreak: number;
  fdShields: number;
  fatalCounters: number;
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
            className="bg-black/80 border-2 border-neutral-700 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] p-6 transform -skew-x-12 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-600 pointer-events-none z-20"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-600 pointer-events-none z-20"></div>

            <div className="flex flex-col md:flex-row items-center gap-8 transform skew-x-12 relative z-10">
              <div className="w-32 h-32 flex-shrink-0">
                <PlayerAvatar playerName={profile.displayName} playerType="A" />
              </div>

              <div className="flex-1 text-center md:text-left flex flex-col justify-center h-full">
                <div className="text-neutral-500 font-bold tracking-widest text-xs uppercase mb-1" style={{ fontFamily: "var(--font-bebas)" }}>
                  HUNTER ID: {profile.id}
                </div>
                <h1
                  className="text-6xl font-black text-white tracking-widest mb-4 uppercase leading-none drop-shadow-[4px_4px_0px_rgba(217,22,22,1)]"
                  style={{
                    fontFamily: "var(--font-bebas)",
                    color: profile.nameColor,
                    textShadow: profile.nameColor !== "#ffffff"
                      ? `0 0 10px ${profile.nameColor}80, 0 0 20px ${profile.nameColor}40`
                      : "4px 4px 0px rgba(217,22,22,1)"
                  }}
                >
                  {profile.displayName}
                </h1>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  {/* W$ Asset Block */}
                  <div className="bg-neutral-900 border-2 border-neutral-700 px-6 py-3 flex items-center gap-4 transform -skew-x-12 shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
                    <div className="transform skew-x-12 flex items-baseline gap-3">
                      <span className="text-neutral-500 font-bold text-sm tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>资产</span>
                      <span className="text-[#39FF14] font-black text-4xl tracking-widest drop-shadow-[0_0_8px_rgba(57,255,20,0.6)]" style={{ fontFamily: "var(--font-bebas)" }}>
                        {profile.points.toLocaleString()} W$
                      </span>
                    </div>
                  </div>

                  {/* Win Streak Block */}
                  <div className={`bg-neutral-900 border-2 ${profile.winStreak >= 3 ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-neutral-700'} px-6 py-3 flex items-center gap-4 transform -skew-x-12 shadow-[4px_4px_0px_rgba(0,0,0,0.8)]`}>
                    <div className="transform skew-x-12 flex items-baseline gap-3">
                      <span className="text-neutral-500 font-bold text-sm tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>连胜悬赏</span>
                      <span className={`font-black text-4xl tracking-widest flex items-baseline gap-2 ${profile.winStreak >= 3 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-white'}`} style={{ fontFamily: "var(--font-bebas)" }}>
                        {profile.winStreak}
                        {profile.winStreak >= 3 && (
                          <span className="text-lg animate-pulse text-red-500 ml-1" style={{ textShadow: "0 0 10px red" }}>🔥 ON FIRE!</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tactical Inventory Section */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Background Text */}
            <div className="absolute -top-6 left-0 text-neutral-800 text-6xl font-black opacity-30 select-none z-0 tracking-tighter" style={{ fontFamily: "var(--font-bebas)" }}>
              TACTICAL GEAR
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl font-black text-white tracking-widest mb-6 drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                战术背包
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 完美防御 Card */}
                <div className={`bg-neutral-950 border-2 ${profile.fdShields > 0 ? 'border-[#00ffff] shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]' : 'border-neutral-800 grayscale opacity-50'} transition-all duration-300 p-6 flex flex-col relative overflow-hidden`} style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)" }}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-4xl">🛡️</div>
                    <div className={`font-black text-3xl tracking-widest ${profile.fdShields > 0 ? 'text-[#00ffff]' : 'text-neutral-500'}`} style={{ fontFamily: "var(--font-bebas)" }}>
                      x {profile.fdShields}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-widest">完美防御</h3>
                  <p className="text-neutral-400 text-sm flex-1">
                    可以抵消一次预测失败的扣分。保持你的连胜不断。
                  </p>
                  {profile.fdShields === 0 && (
                    <div className="absolute bottom-4 right-4 text-neutral-600 font-bold tracking-widest uppercase border border-neutral-700 px-2 py-1 bg-neutral-900" style={{ fontFamily: "var(--font-bebas)" }}>
                      EMPTY
                    </div>
                  )}
                </div>

                {/* 致命打康 Card */}
                <div className={`bg-neutral-950 border-2 ${profile.fatalCounters > 0 ? 'border-[#ffea00] shadow-[0_0_15px_rgba(255,234,0,0.4)] hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,234,0,0.6)]' : 'border-neutral-800 grayscale opacity-50'} transition-all duration-300 p-6 flex flex-col relative overflow-hidden`} style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)" }}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-4xl">⚡</div>
                    <div className={`font-black text-3xl tracking-widest ${profile.fatalCounters > 0 ? 'text-[#ffea00]' : 'text-neutral-500'}`} style={{ fontFamily: "var(--font-bebas)" }}>
                      x {profile.fatalCounters}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-widest">致命打康</h3>
                  <p className="text-neutral-400 text-sm flex-1">
                    使用后可让某场比赛的收益翻倍。高风险高回报的终极手段。
                  </p>
                  {profile.fatalCounters === 0 && (
                    <div className="absolute bottom-4 right-4 text-neutral-600 font-bold tracking-widest uppercase border border-neutral-700 px-2 py-1 bg-neutral-900" style={{ fontFamily: "var(--font-bebas)" }}>
                      EMPTY
                    </div>
                  )}
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
