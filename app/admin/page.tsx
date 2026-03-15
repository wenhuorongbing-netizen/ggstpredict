"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

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
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [bulkInput, setBulkInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [settlingMatchId, setSettlingMatchId] = useState<string | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [recentPlayers, setRecentPlayers] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [stageType, setStageType] = useState<"GROUP" | "BRACKET">("GROUP");
  const [groupId, setGroupId] = useState("A");
  const [tournamentId, setTournamentId] = useState("");
  const [tournaments, setTournaments] = useState<{id: string, name: string}[]>([]);

  // GOD MODE STATES
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<{ id: string, key: string, value: string }[]>([]);
  const [showGodMode, setShowGodMode] = useState(false);
  const [injectA, setInjectA] = useState("");
  const [injectB, setInjectB] = useState("");

  const [settleMatchInfo, setSettleMatchInfo] = useState<{ id: string; winner: "A" | "B"; pName: string } | null>(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [injectMatchId, setInjectMatchId] = useState<string | null>(null);

  const [isCrawlingAvatars, setIsCrawlingAvatars] = useState(false);


  const fetchAdminLogs = async () => {
    try {
      const res = await fetch("/api/admin/logs");
      if (res.ok) setAdminLogs(await res.json());
    } catch (err) {}
  };

  useEffect(() => {
    fetchMatches();
    fetchInvites();
    fetchTournaments();
    fetchUsers();
    fetchSettings();
    fetchAdminLogs();
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("recentPlayers");
      if (stored) setRecentPlayers(JSON.parse(stored));
    }
  }, []);


  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers(await res.json());
    } catch (err) {}
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) setSettings(await res.json());
    } catch (err) {}
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      fetchSettings();
    } catch (err) {}
  };

  const handleUpdateUserPoints = async (id: string, points: number) => {
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      });
      fetchUsers();
    } catch (err) {}
  };

  const handleCrawlAvatars = async () => {
    setIsCrawlingAvatars(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/players/crawl", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "抓取选手真容失败");
      } else {
        alert("成功触发选手真容抓取任务！");
      }
    } catch (err) {
      setError("网络错误，无法连接服务");
    } finally {
      setIsCrawlingAvatars(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("WARNING: This will HARD DELETE the user and ALL THEIR BETS. Proceed?")) return;
    try {
      await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      fetchUsers();
    } catch (err) {}
  };

  const handleInjectFunds = async (matchId: string) => {
    try {
      await fetch(`/api/admin/matches/${matchId}/inject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolInjectA: Number(injectA) || 0, poolInjectB: Number(injectB) || 0 }),
      });
      setInjectMatchId(null);
      setInjectA("");
      setInjectB("");
      fetchMatches();
    } catch (err) {}
  };

  const fetchTournaments = async () => {
    try {
      const res = await fetch("/api/tournaments");
      if (res.ok) {
        const data = await res.json();
        if (data.tournament) {
          setTournaments([data.tournament]);
          setTournamentId(data.tournament.id);
        } else {
          setTournaments([]);
        }
      }
    } catch (err) {}
  };

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
    alert("密钥已复制 (Copied!)");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCrawlAWT = async () => {
    if (!crawlUrl.trim()) {
      setError("请输入赛事源地址 URL");
      return;
    }
    setError(null);
    setIsCrawling(true);
    try {
      const res = await fetch("/api/admin/matches/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "抓取失败");
      } else if (data.matches && Array.isArray(data.matches)) {
        // Append crawled matches to textarea
        const newMatchesStr = data.matches.join("\n");
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
        const rawA = parts[0].trim();
        const rawB = parts[1].trim();

        // Extract optional character in parentheses: Player (Char)
        const extractChar = (rawStr: string) => {
          const match = rawStr.match(/^(.*?)(?:\((.*?)\))?$/);
          if (match) {
            return {
              player: match[1].trim(),
              char: match[2] ? match[2].trim() : null
            };
          }
          return { player: rawStr, char: null };
        };

        const { player: pA, char: charA } = extractChar(rawA);
        const { player: pB, char: charB } = extractChar(rawB);

        if (pA && pB) {
          newMatches.push({ playerA: pA, playerB: pB, charA, charB });
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
        body: JSON.stringify({ matches: newMatches, stageType, groupId, tournamentId }),
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

  const handleSettleMatchPrompt = (matchId: string, winner: "A" | "B", pName: string) => {
    setSettleMatchInfo({ id: matchId, winner, pName });
    setScoreA("");
    setScoreB("");
  };

  const executeSettleMatch = async () => {
    if (!settleMatchInfo) return;
    const { id, winner, pName } = settleMatchInfo;

    const parsedScoreA = parseInt(scoreA, 10);
    const parsedScoreB = parseInt(scoreB, 10);

    if (isNaN(parsedScoreA) || isNaN(parsedScoreB)) {
        alert("请输入有效的比分数字！");
        return;
    }

    setError(null);
    if (!confirm(`⚠️ 危险操作：确认结算比赛并判定 [ ${pName} ] 获胜吗？\n比分：${parsedScoreA} - ${parsedScoreB}\n此操作不可逆，积分将立刻分发！`)) return;

    setSettlingMatchId(id);
    setSettleMatchInfo(null);
    try {
      const res = await fetch("/api/matches/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: id, winner, scoreA: parsedScoreA, scoreB: parsedScoreB }),
      });

      if (!res.ok) setError((await res.json()).error || "结算失败");
      else fetchMatches();
    } catch (err) {
      setError("网络错误，请稍后再试");
    } finally {
      setSettlingMatchId(null);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    setError(null);
    if (!confirm(`⚠️ 警告：确定撤销该赛事吗？此操作将删除比赛并全额退还所有玩家的下注积分！`)) return;

    setDeletingMatchId(matchId);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "DELETE",
      });

      if (!res.ok) setError((await res.json()).error || "删除赛事失败");
      else fetchMatches();
    } catch (err) {
      setError("网络错误，请稍后再试");
    } finally {
      setDeletingMatchId(null);
    }
  };

  const handleUnlockMatch = async (matchId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UNLOCK" }),
      });

      if (!res.ok) setError((await res.json()).error || "强制开盘失败");
      else fetchMatches();
    } catch (err) {
      setError("网络错误，请稍后再试");
    }
  };

  const activeMatches = matches.filter(m => m.status !== "SETTLED");
  const settledMatches = matches.filter(m => m.status === "SETTLED");

  return (
    <ProtectedRoute requireAdmin={true}>
      <AppLayout>
        <div className="max-w-5xl mx-auto relative z-10 p-4 sm:p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-8 transform -skew-x-2 bg-[#1a1a1a] border border-neutral-800 p-4">
          <div className="transform skew-x-2">
            <h1 className="text-4xl font-black text-white tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>OVERSEER PANEL</h1>
            <p className="text-red-500 text-sm tracking-widest font-bold uppercase">System Administration</p>
          </div>
        </div>

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
             新建赛事 (DEPLOYMENT)
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-end mb-6 relative z-10 transform skew-x-2 p-4 bg-[#1a1a1a] border border-neutral-700">
            <div className="flex-1 w-full">
              <label htmlFor="crawlUrl" className="block text-sm text-purple-400 mb-1 font-bold tracking-widest">🔗 赛事源地址 (URL)</label>
              <input
                id="crawlUrl"
                type="url"
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                placeholder="输入 Start.gg / Liquipedia 赛程链接..."
                className="w-full bg-[#0a0a0a] border border-neutral-700 p-2 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                disabled={isCrawling}
              />
            </div>
            <button
              onClick={handleCrawlAWT}
              disabled={isCrawling}
              className="ggst-button border-purple-500 hover:bg-purple-600 px-4 py-2 text-sm shadow-[2px_2px_0px_rgba(168,85,247,0.8)] w-full sm:w-auto h-[42px]"
            >
              {isCrawling ? "CRAWLING..." : "🕷️ AI 神谕抓取"}
            </button>
          </div>

          <form onSubmit={handleCreateMatch} className="flex flex-col gap-4 relative z-10 transform skew-x-2">
            <div className="flex gap-4 mb-2">
              <div className="flex-1">
                <label className="block text-sm text-neutral-400 mb-1 font-bold tracking-widest">锦标赛 (TOURNAMENT)</label>
                <select
                  value={tournamentId}
                  onChange={(e) => setTournamentId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border-2 border-neutral-700 p-2 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">-- 未关联赛事 --</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-neutral-400 mb-1 font-bold tracking-widest">赛制段 (STAGE TYPE)</label>
                <select
                  value={stageType}
                  onChange={(e) => setStageType(e.target.value as "GROUP" | "BRACKET")}
                  className="w-full bg-[#1a1a1a] border-2 border-neutral-700 p-2 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="GROUP">小组赛 (GROUP STAGE)</option>
                  <option value="BRACKET">淘汰赛 (BRACKET)</option>
                </select>
              </div>
              {stageType === "GROUP" && (
                <div className="flex-1">
                  <label className="block text-sm text-neutral-400 mb-1 font-bold tracking-widest">分组 (GROUP ID)</label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full bg-[#1a1a1a] border-2 border-neutral-700 p-2 text-white focus:outline-none focus:border-red-500"
                  >
                    {["A", "B", "C", "D"].map(g => <option key={g} value={g}>Group {g}</option>)}
                  </select>
                </div>
              )}
            </div>

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

        {/* Admin Logs Section */}
        <div className="bg-black/80 border-2 border-neutral-700 p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] mb-10 relative overflow-hidden transform -skew-x-2">
          <div className="flex justify-between items-center mb-6 transform skew-x-2">
            <h2 className="text-3xl font-bold text-white flex items-center gap-2 tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
              📝 操作记录日志 (ACTION LOGS)
            </h2>
            <button onClick={fetchAdminLogs} className="ggst-button px-4 py-1 text-sm border-blue-500 hover:bg-blue-600">REFRESH</button>
          </div>
          <div className="bg-black border border-green-900/30 p-4 h-64 overflow-y-auto font-mono text-xs text-green-500 shadow-inner transform skew-x-2">
            {adminLogs.length === 0 ? (
              <span className="text-green-900 animate-pulse">Waiting for system logs...</span>
            ) : (
              adminLogs.map((log) => (
                <div key={log.id} className="mb-2 border-b border-green-900/20 pb-1">
                  <span className="text-green-700">[{new Date(log.createdAt).toLocaleString()}]</span>
                  <span className="font-bold text-green-400 ml-2">[{log.action}]</span>
                  <span className="ml-2 text-green-200">{log.details}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invite Codes Section */}
        <div className="bg-black/80 border-2 border-neutral-700 p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] mb-10 relative overflow-hidden transform -skew-x-2">
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-500 pointer-events-none z-20"></div>
          <div className="flex justify-between items-center mb-6 transform skew-x-2">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold text-white flex items-center gap-2 tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
                🔑 通行密钥管理 (ACCESS CODES)
              </h2>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  const unused = invites.filter((i: any) => !i.used).map((i: any) => i.code).join('\n');
                  if (unused) {
                    navigator.clipboard.writeText(unused);
                    alert("已复制所有未使用密钥!");
                  } else {
                    alert("无可用密钥!");
                  }
                }}
                className="ggst-button px-6 py-2 border-green-500 hover:bg-green-600 text-lg text-green-100"
                style={{ boxShadow: "4px 4px 0px 0px rgba(34, 197, 94, 0.8)" }}
              >
                [ 📋 一键复制所有未使用密钥 ]
              </button>
              <button
                onClick={handleGenerateInvite}
                disabled={isGeneratingInvite}
                className="ggst-button px-6 py-2 border-yellow-500 hover:bg-yellow-600 text-lg"
                style={{ boxShadow: "4px 4px 0px 0px rgba(234, 179, 8, 0.8)" }}
              >
                {isGeneratingInvite ? "..." : "生成新密钥 (GENERATE)"}
              </button>
            </div>
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
                        className={`w-full text-center p-3 border-2 transition-all font-mono tracking-widest text-sm relative flex items-center justify-center gap-2
                          ${copiedCode === invite.code
                            ? 'bg-green-900/50 border-green-500 text-green-400'
                            : 'bg-[#1a1a1a] border-neutral-700 text-white hover:border-yellow-500 hover:text-yellow-400'
                          }`}
                      >
                        {invite.code}
                        {!(invite as any).used && (
                          <span
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 opacity-50 hover:opacity-100 transition-opacity p-1 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(invite.code);
                            }}
                          >
                            📋
                          </span>
                        )}
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
                    {match.status === "LOCKED" ? (
                      <button
                        onClick={() => handleUnlockMatch(match.id)}
                        className="ggst-button px-6 py-2 border-yellow-500 text-lg hover:bg-yellow-600"
                        style={{ boxShadow: "4px 4px 0px 0px rgba(234, 179, 8, 0.8)" }}
                      >
                        🔓 强制开盘 (LET&apos;S ROCK)
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSettleMatchPrompt(match.id, "A", match.playerA)}
                          disabled={settlingMatchId === match.id || deletingMatchId === match.id}
                          className="ggst-button px-6 py-2 border-red-500 text-lg hover:bg-red-600"
                          style={{ boxShadow: "4px 4px 0px 0px rgba(239, 68, 68, 0.8)" }}
                          aria-label={`判定 ${match.playerA} (A) 胜`}
                        >
                          {settlingMatchId === match.id ? "..." : `P1 WIN`}
                        </button>
                        <button
                          onClick={() => handleSettleMatchPrompt(match.id, "B", match.playerB)}
                          disabled={settlingMatchId === match.id || deletingMatchId === match.id}
                          className="ggst-button px-6 py-2 border-blue-500 text-lg hover:bg-blue-600"
                          style={{ boxShadow: "4px 4px 0px 0px rgba(59, 130, 246, 0.8)" }}
                          aria-label={`判定 ${match.playerB} (B) 胜`}
                        >
                          {settlingMatchId === match.id ? "..." : `P2 WIN`}
                        </button>
                        <button
                          onClick={() => handleDeleteMatch(match.id)}
                          disabled={settlingMatchId === match.id || deletingMatchId === match.id}
                          className="ggst-button px-6 py-2 border-neutral-500 text-lg hover:bg-neutral-600 bg-neutral-800 text-neutral-300"
                          style={{ boxShadow: "4px 4px 0px 0px rgba(115, 115, 115, 0.8)" }}
                          aria-label={`撤销赛事 ${match.id}`}
                        >
                          {deletingMatchId === match.id ? "..." : `🗑️ 撤销赛事 (VOID)`}
                        </button>
                        <button
                          onClick={() => setInjectMatchId(match.id)}
                          className="ggst-button px-4 py-2 border-purple-500 text-sm hover:bg-purple-600 bg-purple-900 text-purple-200"
                          style={{ boxShadow: "4px 4px 0px 0px rgba(168, 85, 247, 0.8)" }}
                        >
                          💉 注入 (INJECT)
                        </button>
                      </>
                    )}
                  </div>

                  {settleMatchInfo?.id === match.id && (
                    <div className="mt-4 pt-4 border-t border-neutral-700/50">
                      <h4 className="text-white font-bold mb-2">SETTLE MATCH - FINAL SCORE</h4>
                      <p className="text-neutral-400 text-sm mb-4">Winner: <span className={settleMatchInfo.winner === "A" ? "text-red-500 font-bold" : "text-blue-500 font-bold"}>{settleMatchInfo.pName}</span></p>
                      <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-neutral-400 text-xs mb-1 font-bold">P1 Score (Score A)</label>
                          <input
                            type="number"
                            min="0"
                            value={scoreA}
                            onChange={(e) => setScoreA(e.target.value)}
                            className="w-full bg-neutral-950 border-2 border-red-900/50 p-2 text-white font-mono"
                            placeholder="e.g. 3"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-neutral-400 text-xs mb-1 font-bold">P2 Score (Score B)</label>
                          <input
                            type="number"
                            min="0"
                            value={scoreB}
                            onChange={(e) => setScoreB(e.target.value)}
                            className="w-full bg-neutral-950 border-2 border-blue-900/50 p-2 text-white font-mono"
                            placeholder="e.g. 1"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={executeSettleMatch}
                          className="ggst-button flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2"
                        >
                          CONFIRM SETTLEMENT
                        </button>
                        <button
                          onClick={() => setSettleMatchInfo(null)}
                          className="ggst-button px-4 border-neutral-600 text-neutral-400 hover:bg-neutral-800"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  )}

                  {injectMatchId === match.id && (
                    <div className="w-full mt-4 p-4 border-2 border-purple-500 bg-purple-900/20 transform skew-x-2">
                      <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex items-center gap-2">
                          <label className="text-purple-300 font-bold">P1 Inject:</label>
                          <input type="number" className="bg-black border border-purple-500 text-white px-2 py-1 w-24" value={injectA} onChange={(e) => setInjectA(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-purple-300 font-bold">P2 Inject:</label>
                          <input type="number" className="bg-black border border-purple-500 text-white px-2 py-1 w-24" value={injectB} onChange={(e) => setInjectB(e.target.value)} />
                        </div>
                        <button onClick={() => handleInjectFunds(match.id)} className="px-4 py-1 bg-purple-500 text-black font-bold border-2 border-purple-300 hover:bg-purple-400">
                          CONFIRM INJECTION
                        </button>
                        <button onClick={() => setInjectMatchId(null)} className="px-4 py-1 bg-neutral-800 text-white border border-neutral-600 hover:bg-neutral-700">
                          CANCEL
                        </button>
                      </div>
                    </div>
                  )}

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
                <div className="flex items-center gap-4 transform skew-x-2">
                  <div className="text-neutral-400 font-bold text-lg bg-[#1a1a1a] px-4 py-1 border border-neutral-800" style={{ fontFamily: "var(--font-bebas)" }}>
                    WINNER: <span className="text-yellow-500 ml-2">{match.winner === "A" ? match.playerA : match.playerB}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteMatch(match.id)}
                    disabled={deletingMatchId === match.id}
                    className="text-red-500 hover:text-red-400 text-xs border border-red-900 bg-red-950/50 px-2 py-1 h-fit"
                  >
                    {deletingMatchId === match.id ? "..." : "HARD DELETE"}
                  </button>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </motion.div>

        </div>

        {/* God Mode Section Toggle */}
        <div className="mt-16 border-t-4 border-red-900 pt-8 relative z-10">
          <button
            onClick={() => setShowGodMode(!showGodMode)}
            className="w-full py-4 bg-red-950 hover:bg-red-900 border-2 border-red-500 text-red-200 font-black text-2xl tracking-widest flex items-center justify-center gap-4 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.5)]"
            style={{ fontFamily: "var(--font-bebas)" }}
          >
            ⚠️ {showGodMode ? "DISABLE" : "ENABLE"} GOD MODE (SYSTEM CONTROLS) ⚠️
          </button>
        </div>

        {/* God Mode Content */}
        <AnimatePresence>
          {showGodMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-8 relative z-10"
            >
              <div className="bg-black/90 border-2 border-red-500 p-8 shadow-[8px_8px_0px_rgba(239,68,68,0.3)] transform -skew-x-2">
                <h2 className="text-4xl font-black text-red-500 mb-6 transform skew-x-2 flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)" }}>
                  <span className="animate-pulse">⚙️</span> SYSTEM CONTROLS
                </h2>

                <div className="transform skew-x-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Settings */}
                  <div className="border border-red-900 p-6 bg-black/50">
                    <h3 className="text-2xl font-bold text-white mb-4 border-b border-red-900 pb-2 flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)" }}>⚙️ 全局机制控制 (SYSTEM CONTROLS)</h3>
                    <div className="space-y-4">
                      {/* Explicit Defined Settings */}
                      <div className="bg-red-950/20 p-4 border border-red-900/50 rounded shadow-inner mb-6">
                        <h4 className="text-lg font-bold text-red-400 mb-4 border-b border-red-900/50 pb-2">动态限额参数 (Betting Limits)</h4>
                        {["GROUP_STAGE_LIMIT", "KNOCKOUT_PERCENT", "KNOCKOUT_MIN"].map(key => {
                          const setting = settings.find(s => s.key === key) || { key, value: key === "GROUP_STAGE_LIMIT" ? "300" : key === "KNOCKOUT_PERCENT" ? "50" : "200" };
                          return (
                            <div key={key} className="flex justify-between items-center bg-black/50 p-2 border border-red-900/30 mb-2">
                              <span className="font-mono text-red-200">
                                {key === "GROUP_STAGE_LIMIT" ? "小组赛限额 (Group Max)" : key === "KNOCKOUT_PERCENT" ? "淘汰赛比例 (KO %)" : "淘汰赛保底 (KO Min)"}
                              </span>
                              <input
                                type="number"
                                id={`input-${key}`}
                                defaultValue={setting.value}
                                className="bg-black border border-red-900/50 px-2 py-1 text-red-100 w-24 text-center font-mono focus:outline-none focus:border-red-500"
                              />
                            </div>
                          );
                        })}
                        <button
                          className="mt-2 w-full py-2 bg-red-800 text-white font-bold text-sm hover:bg-red-700 rounded transition-all"
                          onClick={async () => {
                            const groupLimit = (document.getElementById('input-GROUP_STAGE_LIMIT') as HTMLInputElement).value;
                            const koPercent = (document.getElementById('input-KNOCKOUT_PERCENT') as HTMLInputElement).value;
                            const koMin = (document.getElementById('input-KNOCKOUT_MIN') as HTMLInputElement).value;
                            await handleUpdateSetting("GROUP_STAGE_LIMIT", groupLimit);
                            await handleUpdateSetting("KNOCKOUT_PERCENT", koPercent);
                            await handleUpdateSetting("KNOCKOUT_MIN", koMin);
                            alert("限额参数已保存！");
                          }}
                        >
                          💾 保存限额参数
                        </button>
                      </div>

                      {settings.filter(s => !["GROUP_STAGE_LIMIT", "KNOCKOUT_PERCENT", "KNOCKOUT_MIN"].includes(s.key)).map(s => (
                        <div key={s.id} className="flex justify-between items-center bg-neutral-900 p-3 border border-neutral-700">
                          <span className="font-mono text-neutral-300">{s.key}</span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              defaultValue={s.value}
                              className="bg-black border border-neutral-600 px-2 py-1 text-white w-24 text-center font-mono"
                              onBlur={(e) => handleUpdateSetting(s.key, e.target.value)}
                            />
                            <button className="px-3 bg-red-900 text-white font-bold text-xs hover:bg-red-800" onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              handleUpdateSetting(s.key, input.value);
                            }}>SAVE</button>
                          </div>
                        </div>
                      ))}
                      {/* Quick Add Setting */}
                      <form className="flex gap-2 mt-4 pt-4 border-t border-red-900/50" onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        handleUpdateSetting(form.keyInput.value, form.valInput.value);
                        form.reset();
                      }}>
                        <input name="keyInput" placeholder="New Key" className="bg-black border border-neutral-600 px-2 py-1 text-white flex-1" required />
                        <input name="valInput" placeholder="Value" className="bg-black border border-neutral-600 px-2 py-1 text-white w-24" required />
                        <button type="submit" className="px-3 bg-green-900 text-white font-bold text-xs hover:bg-green-800">ADD</button>
                      </form>
                    </div>
                  </div>

                  {/* Users */}
                  <div className="border border-red-900 p-6 bg-black/50 overflow-y-auto max-h-[500px]">
                    <div className="flex justify-between items-center mb-4 border-b border-red-900 pb-2">
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)" }}>👥 人事与数据库管理 (DATABASE MANAGER)</h3>
                      <button
                        onClick={handleCrawlAvatars}
                        disabled={isCrawlingAvatars}
                        className="ggst-button px-4 py-2 border-purple-500 text-sm hover:bg-purple-600 bg-purple-900 text-purple-200 shadow-[2px_2px_0px_rgba(168,85,247,0.8)]"
                      >
                        {isCrawlingAvatars ? "CRAWLING..." : "📸 全自动抓取选手真容 (CRAWL AVATARS)"}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {users.map(u => (
                        <div key={u.id} className="flex flex-col bg-[#0a0a0a] p-3 border border-red-900/50">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-white">{u.username} <span className="text-xs text-neutral-500 font-mono">({u.role})</span></span>
                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-400 text-xs border border-red-500/50 px-2 py-1 bg-red-950">HARD DELETE</button>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-neutral-400 font-mono">{u.id}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-yellow-500 font-bold text-sm">PTS:</span>
                              <input
                                type="number"
                                defaultValue={u.points}
                                className="bg-black border border-neutral-600 px-2 py-1 text-white w-20 text-right font-mono text-sm"
                                onBlur={(e) => handleUpdateUserPoints(u.id, Number(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </AppLayout>
    </ProtectedRoute>
  );
}