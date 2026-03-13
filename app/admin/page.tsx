"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Match {
  id: string;
  playerA: string;
  playerB: string;
  status: string;
  winner: string | null;
}

interface InviteCode {
  id: string;
  code: string;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [bulkInput, setBulkInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [settlingMatchId, setSettlingMatchId] = useState<string | null>(null);
  const [recentPlayers, setRecentPlayers] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
    fetchInvites();
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("recentPlayers");
      if (stored) setRecentPlayers(JSON.parse(stored));
    }
  }, []);

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      if (res.ok) setMatches(await res.json());
    } catch (err) {
      console.error("Failed to fetch matches", err);
    }
  };

  const fetchInvites = async () => {
    try {
      const res = await fetch("/api/invites");
      if (res.ok) setInvites(await res.json());
    } catch (err) {
      console.error("Failed to fetch invites", err);
    }
  };

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);
    try {
      const res = await fetch("/api/invites", { method: "POST" });
      if (res.ok) {
        fetchInvites();
      } else {
        setError("生成邀请码失败");
      }
    } catch (err) {
      setError("网络错误");
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCrawlAWT = async () => {
    setError(null);
    setIsCrawling(true);
    try {
      const res = await fetch("/api/matches/crawl", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "抓取失败");
      } else if (data.data && Array.isArray(data.data)) {
        // Append crawled matches to textarea
        const newMatchesStr = data.data.join("\n");
        setBulkInput(prev => prev + (prev.trim() === "" ? "" : "\n") + newMatchesStr);
      }
    } catch (err) {
      setError("网络错误，无法连接抓取服务");
    } finally {
      setIsCrawling(false);
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    const lines = bulkInput.split("\n").map(l => l.trim()).filter(line => line !== "" && /vs/i.test(line));
    const newMatches = [];
    const newPlayers = new Set(recentPlayers);

    for (const line of lines) {
      const parts = line.split(/vs/i);
      if (parts.length === 2) {
        const pA = parts[0].trim();
        const pB = parts[1].trim();
        if (pA && pB) {
          newMatches.push({ playerA: pA, playerB: pB });
          newPlayers.add(pA);
          newPlayers.add(pB);
        }
      }
    }

    if (newMatches.length === 0) {
      setError("未检测到有效对决，请检查格式。");
      setIsCreating(false);
      return;
    }

    try {
      const res = await fetch("/api/matches/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMatches),
      });

      if (!res.ok) {
        setError((await res.json()).error || "创建赛事失败");
      } else {
        setBulkInput("");
        fetchMatches();

        // Update recent players
        const updatedPlayers = Array.from(newPlayers).slice(0, 10); // Keep max 10
        setRecentPlayers(updatedPlayers);
        if (typeof window !== "undefined") {
          localStorage.setItem("recentPlayers", JSON.stringify(updatedPlayers));
        }
      }
    } catch (err) {
      setError("网络错误，请稍后再试");
    } finally {
      setIsCreating(false);
    }
  };

  const handleChipClick = (player: string) => {
    setBulkInput(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + player);
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
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-[#111111] bg-[linear-gradient(to_right,#333333_1px,transparent_1px),linear-gradient(to_bottom,#333333_1px,transparent_1px)] bg-[size:40px_40px] text-white p-4 sm:p-8 font-sans selection:bg-red-500/30 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111111] z-0 pointer-events-none"></div>
        <div className="max-w-5xl mx-auto relative z-10">

        {/* Header */}
        <header className="flex justify-between items-center py-6 border-b-4 border-red-600 mb-8 bg-black/90 px-8 shadow-[8px_8px_0px_rgba(239,68,68,0.5)] transform -skew-x-2">
          <div className="transform skew-x-2">
            <h1 className="text-4xl font-black text-white tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>OVERSEER PANEL</h1>
            <p className="text-red-500 text-sm tracking-widest font-bold uppercase">System Administration</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/docs")}
              className="ggst-button px-6 py-2 transform skew-x-2 border-blue-500 hover:bg-blue-600"
              style={{ boxShadow: "4px 4px 0px 0px rgba(59, 130, 246, 0.8)", fontSize: "1.2rem" }}
              aria-label="Docs"
            >
              📚 DOCS
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="ggst-button px-6 py-2 transform skew-x-2 border-white hover:bg-white hover:text-black"
              style={{ boxShadow: "4px 4px 0px 0px rgba(255, 255, 255, 0.8)", fontSize: "1.2rem" }}
              aria-label="返回大厅"
            >
              RETURN ➔
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-950/80 border-2 border-red-500 text-red-200 p-4 mb-6 flex justify-between items-center shadow-[4px_4px_0px_rgba(239,68,68,1)] transform -skew-x-2 animate-ggst-shake"
              role="alert"
            >
              <span className="font-mono text-sm tracking-wide font-bold">SYSTEM ERROR: {error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white p-1" aria-label="关闭提示">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Match Module */}
        <div className="bg-black/80 border-2 border-neutral-700 p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] mb-10 relative overflow-hidden transform -skew-x-2">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-600 pointer-events-none z-20"></div>
          <h2 className="text-3xl font-bold mb-6 text-white flex items-center gap-2 transform skew-x-2 tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
             NEW BATTLE DEPLOYMENT
          </h2>
          <div className="flex justify-between items-end mb-4 relative z-10 transform skew-x-2">
            <button
              onClick={handleCrawlAWT}
              disabled={isCrawling}
              className="ggst-button border-purple-500 hover:bg-purple-600 px-4 py-2 text-sm shadow-[2px_2px_0px_rgba(168,85,247,0.8)]"
            >
              {isCrawling ? "CRAWLING..." : "🕷️ 自动抓取 AWT 赛事数据"}
            </button>
          </div>

          <form onSubmit={handleCreateMatch} className="flex flex-col gap-4 relative z-10 transform skew-x-2">
            <div className="w-full group">
              <label htmlFor="bulkInput" className="block text-xl text-red-500 mb-2 font-bold tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>🤖 批量智能部署 (SMART DEPLOY)</label>
              <p className="text-xs text-neutral-400 mb-2">每行输入一场对决，格式：选手A vs 选手B (例如：Sol vs Ky)</p>
              <textarea
                id="bulkInput"
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder={"Sol vs Ky\nMay vs Ramlethal"}
                rows={4}
                className="w-full bg-[#1a1a1a] border-2 border-neutral-700 p-4 text-white focus:outline-none focus:border-red-500 transition-colors font-mono tracking-widest leading-relaxed resize-y"
                required
              />
            </div>

            {recentPlayers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {recentPlayers.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleChipClick(p)}
                    className="text-xs bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-300 px-3 py-1 rounded transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={isCreating}
                className="ggst-button w-full md:w-64 p-4 text-xl"
                aria-label="部署新赛事"
              >
                {isCreating ? "DEPLOYING..." : "LAUNCH MATCHES"}
              </button>
            </div>
          </form>
        </div>

        {/* Invite Codes Section */}
        <div className="bg-black/80 border-2 border-neutral-700 p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] mb-10 relative overflow-hidden transform -skew-x-2">
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-500 pointer-events-none z-20"></div>
          <div className="flex justify-between items-center mb-6 transform skew-x-2">
            <h2 className="text-3xl font-bold text-white flex items-center gap-2 tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
              🔑 通行密钥管理 (ACCESS CODES)
            </h2>
            <button
              onClick={handleGenerateInvite}
              disabled={isGeneratingInvite}
              className="ggst-button px-6 py-2 border-yellow-500 hover:bg-yellow-600 text-lg"
              style={{ boxShadow: "4px 4px 0px 0px rgba(234, 179, 8, 0.8)" }}
            >
              {isGeneratingInvite ? "..." : "生成新密钥 (GENERATE)"}
            </button>
          </div>

          <div className="transform skew-x-2">
            {invites.length === 0 ? (
              <p className="text-neutral-500 font-mono text-sm">暂无未使用的邀请码</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <AnimatePresence>
                  {invites.map((invite) => (
                    <motion.div
                      key={invite.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                      <button
                        onClick={() => copyToClipboard(invite.code)}
                        className={`w-full text-center p-3 border-2 transition-all font-mono tracking-widest text-sm
                          ${copiedCode === invite.code
                            ? 'bg-green-900/50 border-green-500 text-green-400'
                            : 'bg-[#1a1a1a] border-neutral-700 text-white hover:border-yellow-500 hover:text-yellow-400'
                          }`}
                      >
                        {invite.code}
                      </button>
                      {copiedCode === invite.code && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] px-2 py-0.5 rounded font-bold pointer-events-none z-10">
                          COPIED!
                        </span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Active Matches Section */}
        <h2 className="text-3xl font-bold mb-6 text-white flex items-center gap-2 mt-12 relative z-10 tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
           <span className="text-yellow-500 animate-pulse">●</span> ACTIVE OPERATIONS
        </h2>
        {activeMatches.length === 0 ? (
          <div className="text-center py-16 bg-black/50 border-2 border-neutral-800 border-dashed text-neutral-500 font-bold text-xl relative z-10 transform -skew-x-2 shadow-[8px_8px_0px_rgba(0,0,0,0.5)]" style={{ fontFamily: "var(--font-bebas)" }}>
             [ NO ACTIVE OPERATIONS ]
          </div>
        ) : (
          <div className="grid gap-6 mb-12 relative z-10">
            <AnimatePresence>
              {activeMatches.map((match) => (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-black/80 border-2 border-neutral-700 p-5 flex flex-col md:flex-row justify-between items-center gap-6 transform -skew-x-2 shadow-[8px_8px_0px_rgba(0,0,0,0.5)]"
                >
                  <div className="flex items-center justify-center md:justify-start gap-4 w-full md:w-auto text-2xl transform skew-x-2" style={{ fontFamily: "var(--font-bebas)" }}>
                    <span className="text-red-500 w-32 text-right truncate drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" title={match.playerA}>{match.playerA}</span>
                    <span className="text-white font-black italic text-xl select-none drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]">VS</span>
                    <span className="text-blue-500 w-32 text-left truncate drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" title={match.playerB}>{match.playerB}</span>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto transform skew-x-2">
                    <button
                      onClick={() => handleSettleMatch(match.id, "A", match.playerA)}
                      disabled={settlingMatchId === match.id}
                      className="ggst-button px-6 py-2 border-red-500 text-lg hover:bg-red-600"
                      style={{ boxShadow: "4px 4px 0px 0px rgba(239, 68, 68, 0.8)" }}
                      aria-label={`判定 ${match.playerA} (A) 胜`}
                    >
                      {settlingMatchId === match.id ? "..." : `P1 WIN`}
                    </button>
                    <button
                      onClick={() => handleSettleMatch(match.id, "B", match.playerB)}
                      disabled={settlingMatchId === match.id}
                      className="ggst-button px-6 py-2 border-blue-500 text-lg hover:bg-blue-600"
                      style={{ boxShadow: "4px 4px 0px 0px rgba(59, 130, 246, 0.8)" }}
                      aria-label={`判定 ${match.playerB} (B) 胜`}
                    >
                      {settlingMatchId === match.id ? "..." : `P2 WIN`}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Settled Matches Section */}
        <h2 className="text-3xl font-bold mb-6 text-neutral-500 flex items-center gap-2 border-t-2 border-neutral-800 pt-8 relative z-10 tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
           ≡ ARCHIVED RECORDS
        </h2>
        <motion.div className="grid gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300 relative z-10" layout>
          <AnimatePresence>
            {settledMatches.map((match) => (
              <motion.div
                key={match.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-black/40 border-l-4 border-neutral-800 p-3 flex flex-col sm:flex-row justify-between items-center transform -skew-x-2"
              >
                <div className="font-bold text-xl transform skew-x-2" style={{ fontFamily: "var(--font-bebas)" }}>
                  <span className={match.winner === "A" ? "text-yellow-500 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" : "text-neutral-600"}>{match.playerA}</span>
                  <span className="text-neutral-700 px-4 font-black italic select-none">VS</span>
                  <span className={match.winner === "B" ? "text-yellow-500 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" : "text-neutral-600"}>{match.playerB}</span>
                </div>
                <div className="text-neutral-400 font-bold text-lg bg-[#1a1a1a] px-4 py-1 border border-neutral-800 transform skew-x-2" style={{ fontFamily: "var(--font-bebas)" }}>
                  WINNER: <span className="text-yellow-500 ml-2">{match.winner === "A" ? match.playerA : match.playerB}</span>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>
    </ProtectedRoute>
  );
}