"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import {
  buildLooseKey,
  PLAYER_ROSTER_SIZE,
  buildCaseInsensitiveKey,
  buildDefaultPlayerRoster,
  formatMatchLine,
  normalizePlayerRoster,
  normalizeCharacterName,
  normalizePlayerName,
  OFFICIAL_CHARACTER_NAMES,
  parseBulkMatchInput,
  parsePlayerRosterSetting,
  serializePlayerRosterSetting,
} from "@/lib/tournament-data";
import { EMPTY_CLIENT_ASSET_CATALOG, loadAssetCatalog } from "@/lib/client-asset-catalog";

interface Match {
  id: string;
  playerA: string;
  playerB: string;
  status: string;
  winner: string | null;
  lockAt?: string | null;
}

interface InviteCode {
  id: string;
  code: string;
  used?: boolean;
  createdAt: string;
}

interface AdminLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
}

interface AdminUser {
  id: string;
  username: string;
  displayName?: string;
  points: number;
  role: string;
}

interface PendingPurchase {
  id: string;
  item: string;
  cost: number;
  createdAt: string;
  user?: {
    username?: string;
    displayName?: string;
  };
}

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [bulkInput, setBulkInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [startggGroupId, setStartggGroupId] = useState("");
  const [isStartggFetching, setIsStartggFetching] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [settlingMatchId, setSettlingMatchId] = useState<string | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [recentPlayers, setRecentPlayers] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [stageType, setStageType] = useState<"GROUP" | "BRACKET">("GROUP");
  const [groupId, setGroupId] = useState("A");
  const [tournamentId, setTournamentId] = useState("");
  const [tournaments, setTournaments] = useState<{id: string, name: string}[]>([]);
  const [playerRoster, setPlayerRoster] = useState<string[]>(() => buildDefaultPlayerRoster());
  const [selectedPlayerA, setSelectedPlayerA] = useState("");
  const [selectedPlayerB, setSelectedPlayerB] = useState("");
  const [selectedCharA, setSelectedCharA] = useState("");
  const [selectedCharB, setSelectedCharB] = useState("");
  const [isSavingRoster, setIsSavingRoster] = useState(false);
  const [assetCatalog, setAssetCatalog] = useState(EMPTY_CLIENT_ASSET_CATALOG);

  // GOD MODE STATES
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<{ id: string, key: string, value: string }[]>([]);
  const [showGodMode, setShowGodMode] = useState(false);
  const [injectA, setInjectA] = useState("");
  const [injectB, setInjectB] = useState("");

  const [settleMatchInfo, setSettleMatchInfo] = useState<{ id: string; winner: "A" | "B"; pName: string } | null>(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [injectMatchId, setInjectMatchId] = useState<string | null>(null);

  const [isCrawlingAvatars, setIsCrawlingAvatars] = useState(false);
  const [pendingPurchases, setPendingPurchases] = useState<PendingPurchase[]>([]);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);


  const fetchPendingPurchases = async () => {
    try {
      const res = await fetch("/api/admin/shop/pending");
      if (res.ok) {
        setPendingPurchases(await res.json());
      }
    } catch (err) {}
  };

  const handleFulfillPurchase = async (purchaseId: string) => {
    setFulfillingId(purchaseId);
    try {
      const res = await fetch("/api/admin/shop/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId })
      });
      if (res.ok) {
        fetchPendingPurchases();
      } else {
        setError("标记完成失败");
      }
    } catch (err) {
      setError("网络错误");
    } finally {
      setFulfillingId(null);
    }
  };

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
    fetchPendingPurchases();
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("recentPlayers");
      if (stored) {
        try {
          setRecentPlayers(JSON.parse(stored));
        } catch {
          setRecentPlayers([]);
        }
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadAssetCatalog().then((catalog) => {
      if (!cancelled) {
        setAssetCatalog(catalog);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (playerRoster.some(Boolean)) {
      return;
    }

    const derivedRoster = buildDefaultPlayerRoster([
      ...recentPlayers,
      ...matches.flatMap((match) => [match.playerA, match.playerB]),
    ]);

    if (derivedRoster.some(Boolean)) {
      setPlayerRoster(derivedRoster);
    }
  }, [matches, playerRoster, recentPlayers]);


  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers(await res.json());
    } catch (err) {}
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        const rosterSetting = data.find((setting: { key: string; value: string }) => setting.key === "PLAYER_ROSTER_16");
        if (rosterSetting) {
          setPlayerRoster(parsePlayerRosterSetting(rosterSetting.value));
        }
      }
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

  const handleSavePlayerRoster = async () => {
    setIsSavingRoster(true);
    try {
      const normalizedRoster = buildDefaultPlayerRoster(playerRoster);
      setPlayerRoster(normalizedRoster);
      await handleUpdateSetting("PLAYER_ROSTER_16", serializePlayerRosterSetting(normalizedRoster));
    } finally {
      setIsSavingRoster(false);
    }
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
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedCode(code);
        alert("密钥已复制！");
        setTimeout(() => setCopiedCode(null), 2000);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.prepend(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedCode(code);
        alert("密钥已复制！");
        setTimeout(() => setCopiedCode(null), 2000);
      } catch (error) {
        console.error("Fallback copy failed", error);
      } finally {
        textArea.remove();
      }
    }
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

  const handleStartggFetch = async () => {
    if (!startggGroupId.trim()) {
      setError("请输入 Start.gg Phase Group ID");
      return;
    }
    setError(null);
    setIsStartggFetching(true);
    try {
      const res = await fetch("/api/admin/matches/startgg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseGroupId: startggGroupId.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Start.gg 抓取失败");
      } else if (data.matches && Array.isArray(data.matches)) {
        const newMatchesStr = data.matches.join("\n");
        setBulkInput(prev => prev + (prev.trim() === "" ? "" : "\n") + newMatchesStr);
        alert(`成功抓取 ${data.matches.length} 场比赛！`);
      }
    } catch (err) {
      setError("网络错误，无法连接抓取服务");
    } finally {
      setIsStartggFetching(false);
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);
    const parsed = parseBulkMatchInput(bulkInput, playerSuggestions);
    const newMatches = parsed.matches;

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
        const updatedPlayers = parsed.recentPlayers.slice(0, PLAYER_ROSTER_SIZE);
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

  const handleAddRosterMatch = () => {
    const canonicalizePlayerInput = (value: string) => {
      const normalizedValue = normalizePlayerName(value);
      const matchedValue = playerSuggestions.find(
        (player) => buildCaseInsensitiveKey(player) === buildCaseInsensitiveKey(normalizedValue),
      );
      return matchedValue ?? normalizedValue;
    };
    const canonicalizeCharacterInput = (value: string) => {
      const normalizedValue = normalizeCharacterName(value);
      if (!normalizedValue) {
        return null;
      }

      const matchedValue = characterSuggestions.find(
        (character) => buildLooseKey(character) === buildLooseKey(normalizedValue),
      );
      return matchedValue ?? normalizedValue;
    };

    const playerA = canonicalizePlayerInput(selectedPlayerA);
    const playerB = canonicalizePlayerInput(selectedPlayerB);

    if (!playerA || !playerB) {
      setError("璇峰厛浠?16 浜哄悕鍗曢€夋嫨涓や釜閫夋墜");
      return;
    }

    if (buildCaseInsensitiveKey(playerA) === buildCaseInsensitiveKey(playerB)) {
      setError("涓や釜涓嬫媺妗嗕笉鑳介€夋嫨鍚屼竴浣嶉€夋墜");
      return;
    }

    const line = formatMatchLine({
      playerA,
      playerB,
      charA: canonicalizeCharacterInput(selectedCharA),
      charB: canonicalizeCharacterInput(selectedCharB),
    });

    setBulkInput((previous) => (previous.trim() ? `${previous}\n${line}` : line));
    setSelectedCharA("");
    setSelectedCharB("");
    setError(null);
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

  const handleLockMatch = async (matchId: string, type: "IMMEDIATE" | "COUNTDOWN" | "SCHEDULED", customTime?: string) => {
    setError(null);
    let bodyData: any = { action: "LOCK", lockType: type };

    if (type === "COUNTDOWN") {
      const mins = parseInt(customTime || "0", 10);
      const lockAt = new Date(Date.now() + mins * 60000);
      bodyData.lockTime = lockAt.toISOString();
    } else if (type === "SCHEDULED") {
      if (!customTime) {
        setError("请选择具体的时间");
        return;
      }
      const lockAt = new Date(customTime);
      bodyData.lockTime = lockAt.toISOString();
    }

    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) setError((await res.json()).error || "封盘设置失败");
      else fetchMatches();
    } catch (err) {
      setError("网络错误，请稍后再试");
    }
  };

  const [openLockMenuId, setOpenLockMenuId] = useState<string | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.lock-menu-container')) {
        setOpenLockMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.addEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const activeMatches = matches.filter(m => m.status !== "SETTLED");
  const settledMatches = matches.filter(m => m.status === "SETTLED");

  // 1. 预设 AWT 2026 Korea 核心参赛选手库池 (硬核格斗游戏常客/种子选手)
  const AWT_KOREA_PLAYERS = [
    "UMISHO", "TempestNYC", "Leffen", "Zando", "TigerPop", "Verix",
    "Daru_I-No", "Gobou", "TY", "Mocchi", "Slash", "Sanakan", "TATUMA",
    "NBN", "Daze", "Jack", "Nitro", "SushixHL", "Dejojo", "IBUSHIGIN",
    "Score", "Churara", "Rion", "Garu", "Poka", "TyuRaRa"
  ];

  // 2. 收集所有可能的来源 (优先级从高到低排列，确保正确的大小写被优先记录)
  const rawSuggestions = [
    ...AWT_KOREA_PLAYERS,                                          // AWT 预设名单
    ...assetCatalog.players.choices.map((choice) => choice.label), // public 头像正确文件名
    ...matches.flatMap((match) => [match.playerA, match.playerB]), // 数据库历史记录
    ...playerRoster,                                               // Admin 手动缓存名单
    ...recentPlayers,                                              // 浏览器本地输入记录
  ].filter(Boolean); // 过滤掉潜在的空值

  // 3. 严格去重 (Case-Insensitive Deduplication)
  const uniquePlayerMap = new Map<string, string>();
  rawSuggestions.forEach(name => {
    const cleanName = name.trim();
    const lowerKey = cleanName.toLowerCase();
    // 只有当这个小写 key 不存在时才存入，这样能保留最高优先级的原版大小写
    if (lowerKey && !uniquePlayerMap.has(lowerKey)) {
      uniquePlayerMap.set(lowerKey, cleanName);
    }
  });

  // 4. 转换为数组并按首字母排序
  const playerSuggestions = Array.from(uniquePlayerMap.values()).sort((a, b) => a.localeCompare(b));

  const characterSuggestionMap = new Map<string, string>();
  for (const characterName of [...OFFICIAL_CHARACTER_NAMES, ...assetCatalog.characters.choices.map((choice) => choice.label)]) {
    const normalizedCharacter = normalizeCharacterName(characterName);
    if (!normalizedCharacter) {
      continue;
    }

    const key = buildLooseKey(normalizedCharacter);
    if (!characterSuggestionMap.has(key)) {
      characterSuggestionMap.set(key, normalizedCharacter);
    }
  }
  const characterSuggestions = [...characterSuggestionMap.values()];

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
          <div className="flex flex-col gap-4 mb-6 relative z-10 transform skew-x-2">
            {/* Start.gg Native GraphQL Section */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-end p-4 bg-[#1a1a1a] border-2 border-blue-900/50 shadow-[4px_4px_0px_rgba(59,130,246,0.2)]">
              <div className="flex-1 w-full">
                <label htmlFor="startggGroupId" className="block text-sm text-blue-400 mb-1 font-bold tracking-widest flex items-center gap-2">
                  <span className="text-yellow-500 text-lg">⚡</span> Start.gg 官方 API 直连 (Phase Group ID)
                </label>
                <input
                  id="startggGroupId"
                  type="text"
                  value={startggGroupId}
                  onChange={(e) => setStartggGroupId(e.target.value)}
                  placeholder="输入 Start.gg Phase Group ID (如: 2541323)..."
                  className="w-full bg-[#0a0a0a] border border-blue-900/50 p-2 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                  disabled={isStartggFetching}
                />
              </div>
              <button
                onClick={handleStartggFetch}
                disabled={isStartggFetching}
                className="ggst-button border-blue-500 hover:bg-blue-600 bg-blue-900/30 px-6 py-2 text-sm shadow-[2px_2px_0px_rgba(59,130,246,0.8)] w-full sm:w-auto h-[42px] font-bold tracking-widest text-blue-100"
              >
                {isStartggFetching ? "FETCHING..." : "[ ⚡ Start.gg 官方闪电抓取 ]"}
              </button>
            </div>

            {/* Python Scraper Section */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-end p-4 bg-[#1a1a1a] border border-neutral-700">
              <div className="flex-1 w-full">
                <label htmlFor="crawlUrl" className="block text-sm text-purple-400 mb-1 font-bold tracking-widest">🔗 备用：AI 神谕抓取 (URL)</label>
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
                {isCrawling ? "CRAWLING..." : "🕷️ 备用抓取"}
              </button>
            </div>
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

            <div className="border-2 border-neutral-700 bg-[#111111] p-4">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-xl text-red-400 font-bold tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
                    16 人名单 (PLAYER ROSTER)
                  </h3>
                  <p className="text-xs text-neutral-400">保存后，下方建赛器会只从这 16 个名字里选，减少手输错误。</p>
                </div>
                <button
                  type="button"
                  onClick={handleSavePlayerRoster}
                  disabled={isSavingRoster}
                  className="ggst-button px-4 py-2 text-sm border-yellow-500 hover:bg-yellow-600"
                >
                  {isSavingRoster ? "SAVING..." : "SAVE ROSTER"}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {playerRoster.map((player, index) => (
                  <label key={`roster-${index}`} className="flex flex-col gap-1">
                    <span className="text-[11px] text-neutral-500 font-mono">P{index + 1}</span>
                    <input
                      type="text"
                      value={player}
                      onChange={(e) => {
                        const nextRoster = [...playerRoster];
                        nextRoster[index] = e.target.value;
                        setPlayerRoster(nextRoster);
                      }}
                      placeholder={`Player ${index + 1}`}
                      className="bg-black border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-red-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="border-2 border-blue-900/40 bg-[#111111] p-4">
              <h3 className="text-xl text-blue-400 font-bold tracking-widest mb-2" style={{ fontFamily: "var(--font-bebas)" }}>
                16 人下拉建赛器 (ROSTER BUILDER)
              </h3>
              <p className="text-xs text-neutral-400 mb-4">选手和角色都支持手动输入，也支持从已有选手记录和资源文件下拉选择。</p>
              <datalist id="player-name-options">
                {playerSuggestions.map((player) => (
                  <option key={`player-option-${player}`} value={player} />
                ))}
              </datalist>
              <datalist id="character-name-options">
                {characterSuggestions.map((character) => (
                  <option key={`character-option-${character}`} value={character} />
                ))}
              </datalist>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="block text-sm text-neutral-400 font-bold tracking-widest">PLAYER A</label>
                  <input
                    type="text"
                    list="player-name-options"
                    value={selectedPlayerA}
                    onChange={(e) => setSelectedPlayerA(e.target.value)}
                    placeholder="Type or choose Player A"
                    className="w-full bg-black border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    list="character-name-options"
                    value={selectedCharA}
                    onChange={(e) => setSelectedCharA(e.target.value)}
                    placeholder="Character A (optional)"
                    className="w-full bg-black border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-neutral-400 font-bold tracking-widest">PLAYER B</label>
                  <input
                    type="text"
                    list="player-name-options"
                    value={selectedPlayerB}
                    onChange={(e) => setSelectedPlayerB(e.target.value)}
                    placeholder="Type or choose Player B"
                    className="w-full bg-black border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    list="character-name-options"
                    value={selectedCharB}
                    onChange={(e) => setSelectedCharB(e.target.value)}
                    placeholder="Character B (optional)"
                    className="w-full bg-black border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddRosterMatch}
                disabled={playerSuggestions.length < 2}
                className="ggst-button w-full md:w-auto px-6 py-3 border-blue-500 hover:bg-blue-600 disabled:opacity-40"
              >
                ADD MATCH TO BULK LIST
              </button>
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
                  const unused = invites.filter((invite) => !invite.used).map((invite) => invite.code).join('\n');
                  if (unused) {
                    if (navigator.clipboard && window.isSecureContext) {
                      navigator.clipboard.writeText(unused).then(() => {
                        alert("密钥已复制！");
                      });
                    } else {
                      const textArea = document.createElement("textarea");
                      textArea.value = unused;
                      textArea.style.position = "absolute";
                      textArea.style.left = "-999999px";
                      document.body.prepend(textArea);
                      textArea.select();
                      try {
                        document.execCommand('copy');
                        alert("密钥已复制！");
                      } catch (error) {
                        console.error("Fallback copy failed", error);
                      } finally {
                        textArea.remove();
                      }
                    }
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
                        <span className="flex-1">{invite.code}</span>
                        <span
                          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600 px-2 py-1 text-xs rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(invite.code);
                          }}
                        >
                          [复制]
                        </span>
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

        {/* Black Market Orders Section */}
        <div className="bg-black/80 border-2 border-neutral-700 p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] mb-10 relative overflow-hidden transform -skew-x-2">
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 pointer-events-none z-20"></div>
          <div className="flex justify-between items-center mb-6 transform skew-x-2">
            <h2 className="text-3xl font-bold text-white flex items-center gap-2 tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
              🛒 黑市订单处理 (BLACK MARKET ORDERS)
            </h2>
            <button onClick={fetchPendingPurchases} className="ggst-button px-4 py-1 text-sm border-blue-500 hover:bg-blue-600">REFRESH</button>
          </div>
          <div className="transform skew-x-2 overflow-x-auto">
            {pendingPurchases.length === 0 ? (
              <p className="text-neutral-500 font-mono text-sm">No pending orders.</p>
            ) : (
              <table className="w-full text-left font-mono text-sm border-collapse">
                <thead>
                  <tr className="bg-neutral-900 border-b-2 border-green-900 text-green-500 uppercase tracking-widest">
                    <th className="p-3">User</th>
                    <th className="p-3">Item</th>
                    <th className="p-3">Cost</th>
                    <th className="p-3">Order Time</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {pendingPurchases.map((p) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="border-b border-neutral-800 hover:bg-neutral-900/50 transition-colors"
                      >
                        <td className="p-3 text-white font-bold">{p.user?.displayName || p.user?.username || "Unknown"}</td>
                        <td className="p-3 text-yellow-500">{p.item}</td>
                        <td className="p-3 text-neutral-400">W$ {p.cost}</td>
                        <td className="p-3 text-neutral-500">{new Date(p.createdAt).toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleFulfillPurchase(p.id)}
                            disabled={fulfillingId === p.id}
                            className="bg-green-900 hover:bg-green-700 border border-green-500 text-white px-4 py-1 rounded-sm text-xs tracking-widest transition-colors font-bold shadow-[2px_2px_0px_rgba(34,197,94,0.5)]"
                          >
                            {fulfillingId === p.id ? "PROCESSING..." : "[ ✅ 履行完毕 (MARK FULFILLED) ]"}
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
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
          <div className="flex flex-col gap-2 mb-12 relative z-10">
            <AnimatePresence>
              {activeMatches.map((match) => (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-black/80 border-l-4 border-y border-r border-neutral-800 p-1.5 pl-2 flex flex-col md:flex-row justify-between items-center gap-2 transform -skew-x-2 transition-colors ${match.status === 'OPEN' ? 'border-l-green-500/80 hover:border-l-green-400 bg-gradient-to-r from-green-900/10 to-transparent' : 'border-l-yellow-500/80 hover:border-l-yellow-400 bg-gradient-to-r from-yellow-900/10 to-transparent'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-start gap-2 w-full md:w-auto transform skew-x-2 flex-1">
                    <div className="flex items-center gap-1.5 text-lg" style={{ fontFamily: "var(--font-bebas)" }}>
                      <span className="text-red-500 w-20 text-right truncate drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" title={match.playerA}>{match.playerA}</span>
                      <span className="text-neutral-500 font-black italic text-xs select-none">VS</span>
                      <span className="text-blue-500 w-20 text-left truncate drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" title={match.playerB}>{match.playerB}</span>
                    </div>
                    <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono text-neutral-600 opacity-50 hover:opacity-100 transition-opacity">
                       <span>ID: {match.id.substring(0,8)}</span>
                    </div>
                  </div>

                  <div className="flex gap-1 w-full md:w-auto transform skew-x-2 items-center justify-end">
                    {match.status === "LOCKED" ? (
                      <button
                        onClick={() => handleUnlockMatch(match.id)}
                        className="px-2 py-0.5 bg-yellow-900/50 border border-yellow-500 text-yellow-500 text-[10px] font-bold hover:bg-yellow-600 hover:text-white transition-colors"
                      >
                        🔓 UNLOCK
                      </button>
                    ) : (
                      <>
                        <div className="relative ml-1 mr-1 lock-menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenLockMenuId(openLockMenuId === match.id ? null : match.id);
                            }}
                            className={`px-2 py-0.5 text-[10px] font-bold border transition-colors ${match.lockAt ? 'bg-yellow-900/50 border-yellow-500 text-yellow-400' : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'}`}
                          >
                            {match.lockAt ? `⏳ ${new Date(match.lockAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : "🔒 LOCK"}
                          </button>
                          {openLockMenuId === match.id && (
                            <div className="absolute right-0 top-full pt-1 flex flex-col bg-black border border-neutral-700 shadow-xl z-50 min-w-[140px]">
                              {match.lockAt ? (
                                <button
                                  onClick={() => {
                                    handleUnlockMatch(match.id);
                                    setOpenLockMenuId(null);
                                  }}
                                  className="px-2 py-1.5 text-left text-[10px] text-yellow-500 hover:bg-yellow-900/30 hover:text-yellow-200 border-b border-neutral-800"
                                >
                                  ❌ 取消定时封盘
                                </button>
                              ) : null}
                              <button
                                onClick={() => {
                                  handleLockMatch(match.id, "IMMEDIATE");
                                  setOpenLockMenuId(null);
                                }}
                                className="px-2 py-1.5 text-left text-[10px] text-white hover:bg-neutral-800 border-b border-neutral-800"
                              >
                                ⚡ 立即封盘
                              </button>
                              <button
                                onClick={() => {
                                  handleLockMatch(match.id, "COUNTDOWN", "5");
                                  setOpenLockMenuId(null);
                                }}
                                className="px-2 py-1.5 text-left text-[10px] text-white hover:bg-neutral-800 border-b border-neutral-800"
                              >
                                ⏳ 5分钟后封盘
                              </button>
                              <div className="px-2 py-1.5 flex flex-col gap-1 hover:bg-neutral-900/50">
                                <span className="text-[10px] text-neutral-400">📅 定时封盘:</span>
                                <input
                                  type="datetime-local"
                                  className="text-[10px] bg-black text-white border border-neutral-700 p-0.5"
                                  id={`lock-time-${match.id}`}
                                />
                                <button
                                  onClick={() => {
                                    const val = (document.getElementById(`lock-time-${match.id}`) as HTMLInputElement)?.value;
                                    if (val) {
                                      handleLockMatch(match.id, "SCHEDULED", val);
                                      setOpenLockMenuId(null);
                                    }
                                  }}
                                  className="text-[10px] bg-neutral-800 text-white p-0.5 hover:bg-neutral-700 mt-1"
                                >
                                  确定
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex border border-neutral-700">
                          <button
                            onClick={() => handleSettleMatchPrompt(match.id, "A", match.playerA)}
                            disabled={settlingMatchId === match.id || deletingMatchId === match.id}
                            className="px-2 py-0.5 bg-red-950/40 text-red-500 hover:bg-red-600 hover:text-white text-[10px] font-bold border-r border-neutral-700 transition-colors"
                            aria-label={`判定 ${match.playerA} (A) 胜`}
                          >
                            {settlingMatchId === match.id ? "..." : `P1 WIN`}
                          </button>
                          <button
                            onClick={() => handleSettleMatchPrompt(match.id, "B", match.playerB)}
                            disabled={settlingMatchId === match.id || deletingMatchId === match.id}
                            className="px-2 py-0.5 bg-blue-950/40 text-blue-500 hover:bg-blue-600 hover:text-white text-[10px] font-bold transition-colors"
                            aria-label={`判定 ${match.playerB} (B) 胜`}
                          >
                            {settlingMatchId === match.id ? "..." : `P2 WIN`}
                          </button>
                        </div>

                        <div className="relative group ml-1">
                           <button className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white text-[10px] font-bold">
                             ...
                           </button>
                           <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-black border border-neutral-700 shadow-xl z-50 min-w-[100px]">
                             <button
                               onClick={() => setInjectMatchId(match.id)}
                               className="px-2 py-1.5 text-left text-[10px] text-purple-400 hover:bg-purple-900/30 hover:text-purple-200 border-b border-neutral-800"
                             >
                               💉 INJECT
                             </button>
                             <button
                               onClick={() => handleDeleteMatch(match.id)}
                               disabled={settlingMatchId === match.id || deletingMatchId === match.id}
                               className="px-2 py-1.5 text-left text-[10px] text-red-500 hover:bg-red-900/30 hover:text-red-200"
                             >
                               {deletingMatchId === match.id ? "..." : `🗑️ VOID`}
                             </button>
                           </div>
                        </div>
                      </>
                    )}
                  </div>

                  {settleMatchInfo?.id === match.id && (
                    <div className="w-full mt-1.5 pt-1.5 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 text-[10px] font-bold">SETTLE SCORE | Winner:</span>
                        <span className={settleMatchInfo.winner === "A" ? "text-red-500 text-xs font-bold" : "text-blue-500 text-xs font-bold"}>{settleMatchInfo.pName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={scoreA}
                          onChange={(e) => setScoreA(e.target.value)}
                          className="w-12 bg-black border border-red-900/50 p-0.5 text-white font-mono text-xs text-center focus:border-red-500 focus:outline-none"
                          placeholder="P1"
                        />
                        <span className="text-neutral-600">-</span>
                        <input
                          type="number"
                          min="0"
                          value={scoreB}
                          onChange={(e) => setScoreB(e.target.value)}
                          className="w-12 bg-black border border-blue-900/50 p-0.5 text-white font-mono text-xs text-center focus:border-blue-500 focus:outline-none"
                          placeholder="P2"
                        />
                        <button
                          onClick={executeSettleMatch}
                          className="px-3 py-0.5 bg-red-600/80 border border-red-500 text-white font-bold text-[10px] hover:bg-red-500 ml-1"
                        >
                          CONFIRM
                        </button>
                        <button
                          onClick={() => setSettleMatchInfo(null)}
                          className="px-2 py-0.5 bg-neutral-800/80 border border-neutral-700 text-neutral-400 text-[10px] hover:text-white"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  )}

                  {injectMatchId === match.id && (
                    <div className="w-full mt-1.5 p-1.5 border border-purple-500/30 bg-purple-900/10 transform skew-x-2 text-[10px] flex flex-col md:flex-row gap-2 items-center justify-between">
                      <div className="flex gap-3">
                        <div className="flex items-center gap-1">
                          <label className="text-purple-500 font-bold">P1 INJ:</label>
                          <input type="number" className="bg-black border border-purple-500/50 text-purple-200 px-1 py-0.5 w-16 text-xs focus:outline-none focus:border-purple-400" value={injectA} onChange={(e) => setInjectA(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-purple-500 font-bold">P2 INJ:</label>
                          <input type="number" className="bg-black border border-purple-500/50 text-purple-200 px-1 py-0.5 w-16 text-xs focus:outline-none focus:border-purple-400" value={injectB} onChange={(e) => setInjectB(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleInjectFunds(match.id)} className="px-2 py-0.5 bg-purple-800/80 border border-purple-500 text-purple-100 font-bold hover:bg-purple-700">
                          CONFIRM
                        </button>
                        <button onClick={() => setInjectMatchId(null)} className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white">
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
        <motion.div className="flex flex-col gap-1 opacity-50 hover:opacity-100 transition-opacity duration-300 relative z-10" layout>
          <AnimatePresence>
            {settledMatches.map((match) => (
              <motion.div
                key={match.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-black/40 border-l-4 border-neutral-800 p-1.5 flex flex-col sm:flex-row justify-between items-center transform -skew-x-2"
              >
                <div className="font-bold text-lg transform skew-x-2 flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)" }}>
                  <span className={match.winner === "A" ? "text-yellow-500 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] w-20 text-right truncate" : "text-neutral-600 w-20 text-right truncate"}>{match.playerA}</span>
                  <span className="text-neutral-700 font-black italic select-none text-xs">VS</span>
                  <span className={match.winner === "B" ? "text-yellow-500 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] w-20 text-left truncate" : "text-neutral-600 w-20 text-left truncate"}>{match.playerB}</span>
                </div>
                <div className="flex items-center gap-2 transform skew-x-2">
                  <div className="text-neutral-400 font-bold text-sm bg-[#1a1a1a] px-2 py-0.5 border border-neutral-800" style={{ fontFamily: "var(--font-bebas)" }}>
                    WINNER: <span className="text-yellow-500 ml-2">{match.winner === "A" ? match.playerA : match.playerB}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteMatch(match.id)}
                    disabled={deletingMatchId === match.id}
                    className="text-red-500 hover:text-red-400 text-[10px] border border-red-900 bg-red-950/50 px-2 py-0.5 h-fit font-bold"
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
                        {["GROUP_MAX", "KO_PERCENT", "KO_MIN"].map(key => {
                          const setting = settings.find(s => s.key === key) || { key, value: key === "GROUP_MAX" ? "300" : key === "KO_PERCENT" ? "50" : "200" };
                          return (
                            <div key={key} className="flex justify-between items-center bg-black/50 p-2 border border-red-900/30 mb-2">
                              <span className="font-mono text-red-200">
                                {key === "GROUP_MAX" ? "小组赛限额 (GROUP_MAX)" : key === "KO_PERCENT" ? "淘汰赛比例 (KO_PERCENT)" : "淘汰赛保底 (KO_MIN)"}
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
                            const groupLimit = (document.getElementById('input-GROUP_MAX') as HTMLInputElement).value;
                            const koPercent = (document.getElementById('input-KO_PERCENT') as HTMLInputElement).value;
                            const koMin = (document.getElementById('input-KO_MIN') as HTMLInputElement).value;
                            await handleUpdateSetting("GROUP_MAX", groupLimit);
                            await handleUpdateSetting("KO_PERCENT", koPercent);
                            await handleUpdateSetting("KO_MIN", koMin);
                            alert("限额参数已保存！");
                          }}
                        >
                          💾 保存限额参数
                        </button>
                      </div>

                      {/* AWT Stage Status Settings */}
                      <div className="bg-yellow-950/20 p-4 border border-yellow-900/50 rounded shadow-inner mb-6">
                        <h4 className="text-lg font-bold text-yellow-500 mb-4 border-b border-yellow-900/50 pb-2">AWT 赛制状态 (Stage Status)</h4>
                        <div className="space-y-4">
                          <div className="bg-black/50 p-3 border border-yellow-900/30">
                            <label className="block text-yellow-400 font-mono mb-2">✨ 晋级名单 (AWT_ADVANCED_PLAYERS)</label>
                            <input
                              type="text"
                              id="input-AWT_ADVANCED_PLAYERS"
                              defaultValue={settings.find(s => s.key === "AWT_ADVANCED_PLAYERS")?.value || ""}
                              placeholder="e.g. UMISHO, TempestNYC"
                              className="w-full bg-black border border-yellow-900/50 px-3 py-2 text-yellow-100 font-mono focus:outline-none focus:border-yellow-500"
                            />
                            <p className="text-neutral-500 text-xs mt-1">输入用逗号分隔的选手名字</p>
                          </div>

                          <div className="bg-black/50 p-3 border border-red-900/30">
                            <label className="block text-red-400 font-mono mb-2">💀 淘汰名单 (AWT_ELIMINATED_PLAYERS)</label>
                            <input
                              type="text"
                              id="input-AWT_ELIMINATED_PLAYERS"
                              defaultValue={settings.find(s => s.key === "AWT_ELIMINATED_PLAYERS")?.value || ""}
                              placeholder="e.g. Zando, Leffen"
                              className="w-full bg-black border border-red-900/50 px-3 py-2 text-red-100 font-mono focus:outline-none focus:border-red-500"
                            />
                            <p className="text-neutral-500 text-xs mt-1">输入用逗号分隔的选手名字</p>
                          </div>

                          <button
                            className="w-full py-2 bg-yellow-800 text-white font-bold text-sm hover:bg-yellow-700 rounded transition-all"
                            onClick={async () => {
                              const advanced = (document.getElementById('input-AWT_ADVANCED_PLAYERS') as HTMLInputElement).value;
                              const eliminated = (document.getElementById('input-AWT_ELIMINATED_PLAYERS') as HTMLInputElement).value;
                              await handleUpdateSetting("AWT_ADVANCED_PLAYERS", advanced);
                              await handleUpdateSetting("AWT_ELIMINATED_PLAYERS", eliminated);
                              alert("赛制状态名单已保存！");
                            }}
                          >
                            💾 保存状态名单
                          </button>
                        </div>
                      </div>

                      {settings.filter(s => !["GROUP_MAX", "KO_PERCENT", "KO_MIN", "GROUP_STAGE_LIMIT", "KNOCKOUT_PERCENT", "KNOCKOUT_MIN", "AWT_ADVANCED_PLAYERS", "AWT_ELIMINATED_PLAYERS"].includes(s.key)).map(s => (
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
