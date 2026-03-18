"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

interface LeaderboardUser {
  id: string;
  displayName: string;
  nameColor?: string;
  points: number;
  isHexed?: boolean;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/leaderboard?limit=10&page=${page}`);
        if (res.ok) {
          const data = await res.json();
          setLeaders(data.users || data); // fallback if old api
          setTotalPages(data.totalPages || 1);
        }
      } catch (error) {
        console.error("Failed to load leaderboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [page]);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-5xl mx-auto relative z-10 p-4 sm:p-8">

          {/* Header */}
          <div className="flex justify-between items-center mb-12 transform -skew-x-2 bg-[#1a1a1a] border border-neutral-800 p-4">
            <div className="transform skew-x-2">
              <h1 className="text-4xl font-black text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(234,179,8,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                悬赏排行榜
              </h1>
              <p className="text-yellow-500 text-sm tracking-widest font-bold uppercase">全球排名</p>
            </div>
          </div>

          {/* Wanted List */}
          <div className="bg-black/80 border-4 border-red-600 p-8 shadow-[0_0_20px_rgba(239,68,68,0.6)] mb-10 relative overflow-hidden transform -skew-x-2 min-h-[50vh]">
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white pointer-events-none z-20"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white pointer-events-none z-20"></div>

            <h2 className="text-5xl font-black mb-10 text-white flex items-center gap-4 transform skew-x-2 tracking-widest drop-shadow-[4px_4px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
               <span className="text-red-500 animate-pulse">🔥</span> 悬赏榜单 (HIGH SCORES) <span className="text-red-500 animate-pulse">🔥</span>
            </h2>

            <div className="transform skew-x-2">
              {loading ? (
                <div className="text-center py-10 font-mono text-yellow-500 animate-pulse">
                  正在定位目标 (LOCATING)...
                </div>
              ) : leaders.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 font-bold" style={{ fontFamily: "var(--font-bebas)" }}>
                  [ 未找到数据 ]
                </div>
              ) : (
                <div className="grid gap-4">
                  <AnimatePresence>
                    {leaders.map((user, index) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex justify-between items-center p-6 border-l-8 transform transition-all hover:translate-x-2 ${
                          index === 0 && page === 1 ? "border-yellow-400 bg-yellow-900/20 shadow-[0_0_15px_rgba(250,204,21,0.4)]" :
                          index === 1 && page === 1 ? "border-neutral-400 bg-neutral-800/40 shadow-[0_0_10px_rgba(163,163,163,0.3)]" :
                          index === 2 && page === 1 ? "border-amber-700 bg-amber-900/30 shadow-[0_0_10px_rgba(180,83,9,0.3)]" :
                          "border-neutral-800 bg-black/50 hover:border-neutral-600"
                        }`}
                      >
                        <div className="flex items-center gap-6">
                          <div className={`text-5xl font-black w-20 text-center tracking-widest ${
                            index === 0 && page === 1 ? "text-yellow-400 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" :
                            index === 1 && page === 1 ? "text-neutral-300 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" :
                            index === 2 && page === 1 ? "text-amber-600 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" :
                            "text-neutral-600"
                          }`} style={{ fontFamily: "var(--font-bebas)" }}>
                            #{(page - 1) * 10 + index + 1}
                          </div>
                          <div className={`font-black tracking-widest ${
                            index === 0 && page === 1 ? "text-3xl text-white" :
                            index < 3 && page === 1 ? "text-2xl text-gray-100" :
                            "text-xl text-neutral-300"
                          }`} style={{ fontFamily: "var(--font-bebas)", color: user.nameColor && user.nameColor !== "#ffffff" ? user.nameColor : undefined, textShadow: user.nameColor && user.nameColor !== "#ffffff" ? "0 0 8px currentColor" : undefined }}>
                            {user.displayName} {user.isHexed && <span title="被诅咒的用户 (Hexed)" className="ml-3 px-2 py-0.5 bg-[#4c1d95] text-[#d8b4fe] border border-[#a855f7] text-sm md:text-base align-middle animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.6)]" style={{ fontFamily: "var(--font-bebas)" }}>[ 罗比! ]</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className={`font-black tracking-widest ${
                            index === 0 && page === 1 ? "text-4xl text-yellow-400 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" :
                            index === 1 && page === 1 ? "text-3xl text-neutral-300" :
                            index === 2 && page === 1 ? "text-3xl text-amber-600" :
                            "text-2xl text-neutral-400"
                          }`} style={{ fontFamily: "var(--font-bebas)" }}>
                            {Math.floor(user.points).toLocaleString()}
                          </div>
                          <div className="text-[12px] text-neutral-500 font-mono font-bold uppercase tracking-widest">W$ Bounty</div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Pagination Controls */}
                  <div className="flex justify-between items-center mt-8 border-t-2 border-neutral-800 pt-4">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="ggst-button px-6 py-2 border-neutral-500 text-neutral-400 hover:text-white hover:border-white disabled:opacity-30"
                      style={{ fontFamily: "var(--font-bebas)" }}
                    >
                      [ &lt; ] PREV
                    </button>
                    <span className="font-mono text-yellow-500 font-bold">PAGE {page} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="ggst-button px-6 py-2 border-neutral-500 text-neutral-400 hover:text-white hover:border-white disabled:opacity-30"
                      style={{ fontFamily: "var(--font-bebas)" }}
                    >
                      NEXT [ &gt; ]
                    </button>
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
