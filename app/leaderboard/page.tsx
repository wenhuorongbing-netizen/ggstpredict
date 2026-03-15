"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

interface LeaderboardUser {
  id: string;
  displayName: string;
  points: number;
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
          <div className="bg-black/80 border-2 border-neutral-700 p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] mb-10 relative overflow-hidden transform -skew-x-2 min-h-[50vh]">
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-500 pointer-events-none z-20"></div>

            <h2 className="text-3xl font-bold mb-8 text-white flex items-center gap-2 transform skew-x-2 tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
               通缉名单 (WANTED)
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
                        className={`flex justify-between items-center p-4 border-2 ${
                          index === 0 && page === 1 ? "border-yellow-500 bg-yellow-900/20 shadow-[4px_4px_0px_rgba(234,179,8,0.5)]" :
                          index === 1 && page === 1 ? "border-neutral-400 bg-neutral-900/50" :
                          index === 2 && page === 1 ? "border-amber-700 bg-amber-950/30" :
                          "border-neutral-800 bg-black/50 hover:border-neutral-600 transition-colors"
                        }`}
                      >
                        <div className="flex items-center gap-6">
                          <div className={`text-4xl font-black w-16 text-center ${
                            index === 0 && page === 1 ? "text-yellow-500 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" :
                            index === 1 && page === 1 ? "text-neutral-400" :
                            index === 2 && page === 1 ? "text-amber-700" :
                            "text-neutral-700"
                          }`} style={{ fontFamily: "var(--font-bebas)" }}>
                            #{(page - 1) * 10 + index + 1}
                          </div>
                          <div className="font-bold text-xl text-white tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
                            {user.displayName}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className={`text-2xl font-black tracking-widest ${
                            index === 0 && page === 1 ? "text-yellow-500" : "text-white"
                          }`} style={{ fontFamily: "var(--font-bebas)" }}>
                            {Math.floor(user.points).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono font-bold">W$ 悬赏金</div>
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
