"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
<<<<<<< Updated upstream
=======
import {
  buildLooseKey,
  PLAYER_ROSTER_SIZE,
  buildCaseInsensitiveKey,
  formatMatchLine,
  normalizePlayerRoster,
  normalizeCharacterName,
  normalizePlayerName,
  OFFICIAL_CHARACTER_NAMES,
  parseBulkMatchInput,
} from "@/lib/tournament-data";
import { EMPTY_CLIENT_ASSET_CATALOG, loadAssetCatalog } from "@/lib/client-asset-catalog";
import { hasScheduledBettingClosed, parseBettingCloseDate, type BettingCloseMode } from "@/lib/match-betting";
>>>>>>> Stashed changes

interface Match {
  id: string;
  playerA: string;
  playerB: string;
  status: string;
  winner: string | null;
  stageType?: string | null;
  groupId?: string | null;
  bettingClosesAt?: string | null;
  bettingClosed?: boolean;
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
<<<<<<< Updated upstream
=======
  const [selectedPlayerA, setSelectedPlayerA] = useState("");
  const [selectedPlayerB, setSelectedPlayerB] = useState("");
  const [selectedCharA, setSelectedCharA] = useState("");
  const [selectedCharB, setSelectedCharB] = useState("");
  const [assetCatalog, setAssetCatalog] = useState(EMPTY_CLIENT_ASSET_CATALOG);
>>>>>>> Stashed changes

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
  const [closeMatchId, setCloseMatchId] = useState<string | null>(null);
  const [betCloseMode, setBetCloseMode] = useState<BettingCloseMode>("IMMEDIATE");
  const [betCloseDelayMinutes, setBetCloseDelayMinutes] = useState("15");
  const [betCloseAt, setBetCloseAt] = useState("");
  const [closingMatchId, setClosingMatchId] = useState<string | null>(null);
  const [isGeneratingBracketTemplate, setIsGeneratingBracketTemplate] = useState(false);

  const [isCrawlingAvatars, setIsCrawlingAvatars] = useState(false);
  const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
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
        setError("鏍囪瀹屾垚澶辫触");
      }
    } catch (err) {
      setError("缃戠粶閿欒");
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
      if (stored) setRecentPlayers(JSON.parse(stored));
    }
  }, []);

<<<<<<< Updated upstream
=======
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

>>>>>>> Stashed changes

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers(await res.json());
    } catch (err) {}
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
<<<<<<< Updated upstream
      if (res.ok) setSettings(await res.json());
=======
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
>>>>>>> Stashed changes
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
        setError(data.error || "抓取选手头像失败");
      } else {
        alert("已触发选手头像抓取任务。");
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
        setError("鐢熸垚閭€璇风爜澶辫触");
      }
    } catch (err) {
      setError("缃戠粶閿欒");
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const copyToClipboard = (code: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedCode(code);
        alert("瀵嗛挜宸插鍒讹紒");
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
        alert("瀵嗛挜宸插鍒讹紒");
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
      setError("璇疯緭鍏ヨ禌浜嬫簮鍦板潃 URL");
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
        setError(data.error || "鎶撳彇澶辫触");
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
      setError("璇疯緭鍏?Start.gg Phase Group ID");
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
        setError(data.error || "Start.gg 鎶撳彇澶辫触");
      } else if (data.matches && Array.isArray(data.matches)) {
        const newMatchesStr = data.matches.join("\n");
        setBulkInput(prev => prev + (prev.trim() === "" ? "" : "\n") + newMatchesStr);
        alert(`鎴愬姛鎶撳彇 ${data.matches.length} 鍦烘瘮璧涳紒`);
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
      setError("未检测到有效对局，请检查格式。");
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
        setError((await res.json()).error || "鍒涘缓璧涗簨澶辫触");
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
      setError("缃戠粶閿欒锛岃绋嶅悗鍐嶈瘯");
    } finally {
      setIsCreating(false);
    }
  };

  const handleChipClick = (player: string) => {
    setBulkInput(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + player);
  };

<<<<<<< Updated upstream
=======
  const handleGenerateBracketTemplate = async () => {
    if (!tournamentId) {
      setError("请先选择赛事，再生成淘汰赛骨架。");
      return;
    }

    setError(null);
    setIsGeneratingBracketTemplate(true);

    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/bracket-template`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "生成淘汰赛骨架失败");
        return;
      }

      fetchMatches();
      fetchTournaments();
      alert(`已生成 ${data.created ?? 0} 场淘汰赛占位对阵。`);
    } catch (err) {
      setError("生成淘汰赛骨架失败");
    } finally {
      setIsGeneratingBracketTemplate(false);
    }
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
      setError("鐠囧嘲鍘涙禒?16 娴滃搫鎮曢崡鏇⑩偓澶嬪娑撱倓閲滈柅澶嬪");
      return;
    }

    if (buildCaseInsensitiveKey(playerA) === buildCaseInsensitiveKey(playerB)) {
      setError("娑撱倓閲滄稉瀣濡楀棔绗夐懗浠嬧偓澶嬪閸氬奔绔存担宥夆偓澶嬪");
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

>>>>>>> Stashed changes
  const handleSettleMatchPrompt = (matchId: string, winner: "A" | "B", pName: string) => {
    setInjectMatchId(null);
    setCloseMatchId(null);
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
        alert("请输入有效的比分数字。");
        return;
    }

    setError(null);
    if (!confirm(`⚠️ 危险操作：确认结算比赛并判定 [ ${pName} ] 获胜吗？\n比分：${parsedScoreA} - ${parsedScoreB}\n此操作不可逆，积分将立即分发。`)) return;

    setSettlingMatchId(id);
    setSettleMatchInfo(null);
    try {
      const res = await fetch("/api/matches/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: id, winner, scoreA: parsedScoreA, scoreB: parsedScoreB }),
      });

      if (!res.ok) setError((await res.json()).error || "缁撶畻澶辫触");
      else fetchMatches();
    } catch (err) {
      setError("缃戠粶閿欒锛岃绋嶅悗鍐嶈瘯");
    } finally {
      setSettlingMatchId(null);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    setError(null);
    if (!confirm("确定撤销这场比赛吗？未结算下注会全额退回。")) return;

    setDeletingMatchId(matchId);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "DELETE",
      });

      if (!res.ok) setError((await res.json()).error || "撤销比赛失败");
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

      if (!res.ok) setError((await res.json()).error || "开盘失败");
      else fetchMatches();
    } catch (err) {
      setError("网络错误，请稍后再试");
    }
  };

<<<<<<< Updated upstream
  const activeMatches = matches.filter(m => m.status !== "SETTLED");
  const settledMatches = matches.filter(m => m.status === "SETTLED");
=======
  const openClosePanel = (match: Match) => {
    setSettleMatchInfo(null);
    setInjectMatchId(null);
    setCloseMatchId(match.id);
    setBetCloseMode("IMMEDIATE");
    setBetCloseDelayMinutes("15");
    const closesAt = parseBettingCloseDate(match.bettingClosesAt);
    setBetCloseAt(closesAt ? new Date(closesAt.getTime() - closesAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
  };

  const handleSetBettingClose = async (matchId: string) => {
    setError(null);
    setClosingMatchId(matchId);

    try {
      const payload: Record<string, unknown> = {
        action: "SET_BETTING_CLOSE",
        mode: betCloseMode,
      };

      if (betCloseMode === "DELAY") {
        payload.delayMinutes = Number(betCloseDelayMinutes);
      }

      if (betCloseMode === "AT") {
        payload.closeAt = betCloseAt ? new Date(betCloseAt).toISOString() : null;
      }

      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "设置封盘失败");
        return;
      }

      setCloseMatchId(null);
      setBetCloseAt("");
      fetchMatches();
    } catch (err) {
      setError("网络错误，请稍后再试");
    } finally {
      setClosingMatchId(null);
    }
  };

  const handleClearBettingClose = async (matchId: string) => {
    setError(null);
    setClosingMatchId(matchId);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLEAR_BETTING_CLOSE" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取消封盘失败");
        return;
      }

      setCloseMatchId(null);
      setBetCloseAt("");
      fetchMatches();
    } catch (err) {
      setError("网络错误，请稍后再试");
    } finally {
      setClosingMatchId(null);
    }
  };

  const formatBettingCloseLabel = (match: Match) => {
    if (match.status === "LOCKED") {
      return "未开盘";
    }

    const closesAt = parseBettingCloseDate(match.bettingClosesAt);
    if (!closesAt) {
      return match.status === "OPEN" ? "未设置封盘" : "不可下注";
    }

    if (hasScheduledBettingClosed(match)) {
      return `已封盘 · ${closesAt.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    return `封盘于 · ${closesAt.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const bettingCloseModeOptions: { mode: BettingCloseMode; label: string; hint: string }[] = [
    { mode: "IMMEDIATE", label: "立刻封盘", hint: "保存后立即停止下注" },
    { mode: "DELAY", label: "分钟后封盘", hint: "按分钟倒计时封盘" },
    { mode: "AT", label: "指定时间封盘", hint: "按日期时间封盘" },
  ];

  const activeMatches = matches.filter((m) => m.status !== "SETTLED");
  const settledMatches = matches.filter((m) => m.status === "SETTLED");
  const assetRoster = assetCatalog.players.choices.map((choice) => choice.label);
  const autoRosterPlayers = normalizePlayerRoster(assetRoster).slice(0, PLAYER_ROSTER_SIZE);
  const playerSuggestions = normalizePlayerRoster([
    ...assetRoster,
    ...recentPlayers,
    ...matches.flatMap((match) => [match.playerA, match.playerB]),
  ]);
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
>>>>>>> Stashed changes

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
                  <span className="text-yellow-500 text-lg">◎</span> Start.gg 官方 API 直连 (Phase Group ID)
                </label>
                <input
                  id="startggGroupId"
                  type="text"
                  value={startggGroupId}
                  onChange={(e) => setStartggGroupId(e.target.value)}
                  placeholder="杈撳叆 Start.gg Phase Group ID (濡? 2541323)..."
                  className="w-full bg-[#0a0a0a] border border-blue-900/50 p-2 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                  disabled={isStartggFetching}
                />
              </div>
              <button
                onClick={handleStartggFetch}
                disabled={isStartggFetching}
                className="ggst-button border-blue-500 hover:bg-blue-600 bg-blue-900/30 px-6 py-2 text-sm shadow-[2px_2px_0px_rgba(59,130,246,0.8)] w-full sm:w-auto h-[42px] font-bold tracking-widest text-blue-100"
              >
                {isStartggFetching ? "FETCHING..." : "[ 鈿?Start.gg 瀹樻柟闂數鎶撳彇 ]"}
              </button>
            </div>

            {/* Python Scraper Section */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-end p-4 bg-[#1a1a1a] border border-neutral-700">
              <div className="flex-1 w-full">
                <label htmlFor="crawlUrl" className="block text-sm text-purple-400 mb-1 font-bold tracking-widest">馃敆 澶囩敤锛欰I 绁炶皶鎶撳彇 (URL)</label>
                <input
                  id="crawlUrl"
                  type="url"
                  value={crawlUrl}
                  onChange={(e) => setCrawlUrl(e.target.value)}
                  placeholder="杈撳叆 Start.gg / Liquipedia 璧涚▼閾炬帴..."
                  className="w-full bg-[#0a0a0a] border border-neutral-700 p-2 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                  disabled={isCrawling}
                />
              </div>
              <button
                onClick={handleCrawlAWT}
                disabled={isCrawling}
                className="ggst-button border-purple-500 hover:bg-purple-600 px-4 py-2 text-sm shadow-[2px_2px_0px_rgba(168,85,247,0.8)] w-full sm:w-auto h-[42px]"
              >
                {isCrawling ? "CRAWLING..." : "备用抓取"}
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateMatch} className="flex flex-col gap-4 relative z-10 transform skew-x-2">
            <div className="flex gap-4 mb-2">
              <div className="flex-1">
                <label className="block text-sm text-neutral-400 mb-1 font-bold tracking-widest">閿︽爣璧?(TOURNAMENT)</label>
                <select
                  value={tournamentId}
                  onChange={(e) => setTournamentId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border-2 border-neutral-700 p-2 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">-- 鏈叧鑱旇禌浜?--</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-neutral-400 mb-1 font-bold tracking-widest">璧涘埗娈?(STAGE TYPE)</label>
                <select
                  value={stageType}
                  onChange={(e) => setStageType(e.target.value as "GROUP" | "BRACKET")}
                  className="w-full bg-[#1a1a1a] border-2 border-neutral-700 p-2 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="GROUP">灏忕粍璧?(GROUP STAGE)</option>
                  <option value="BRACKET">娣樻卑璧?(BRACKET)</option>
                </select>
              </div>
              {stageType === "GROUP" && (
                <div className="flex-1">
                  <label className="block text-sm text-neutral-400 mb-1 font-bold tracking-widest">鍒嗙粍 (GROUP ID)</label>
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

<<<<<<< Updated upstream
=======
            <div className="flex flex-wrap items-center justify-between gap-3 border border-red-900/40 bg-black/40 px-4 py-3">
              <div>
                <div className="text-sm font-bold tracking-[0.18em] text-red-300">AWT KOREA 淘汰赛骨架</div>
                <div className="mt-1 text-xs tracking-[0.08em] text-neutral-500">
                  一键生成占位淘汰赛，对阵会先显示 A组第一 / B组第二 / LCQ 之类的来源位，后续结算会自动把胜败者推进下一轮。
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateBracketTemplate}
                disabled={isGeneratingBracketTemplate || !tournamentId}
                className="ggst-button px-5 py-3 text-sm border-red-500 hover:bg-red-600 disabled:opacity-40"
              >
                {isGeneratingBracketTemplate ? "生成中..." : "生成淘汰赛骨架"}
              </button>
            </div>

            {/* <div className="border-2 border-neutral-700 bg-[#111111] p-4">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-xl text-red-400 font-bold tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
                    16 浜哄悕鍗?(PLAYER ROSTER)
                  </h3>
                  <p className="text-xs text-neutral-400">淇濆瓨鍚庯紝涓嬫柟寤鸿禌鍣ㄤ細鍙粠杩?16 涓悕瀛楅噷閫夛紝鍑忓皯鎵嬭緭閿欒銆?/p>
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
            </div> */}

            <div className="border-2 border-blue-900/40 bg-[#111111] p-4">
              <h3 className="hidden text-xl text-blue-400 font-bold tracking-widest mb-2" style={{ fontFamily: "var(--font-bebas)" }}>
                16 浜轰笅鎷夊缓璧涘櫒 (ROSTER BUILDER)
              </h3>
              <h3 className="text-xl text-blue-400 font-bold tracking-widest mb-2" style={{ fontFamily: "var(--font-bebas)" }}>
                AUTO PLAYER ROSTER
              </h3>
              <p className="text-xs text-neutral-400 mb-4">
                Player names now come directly from `public/assets/players`. You can still type freely, but the dropdown roster is generated automatically from avatar filenames and recorded matches.
              </p>
              <div className="mb-4 border border-blue-900/40 bg-black/40 p-3">
                <div className="mb-2 text-[11px] font-mono tracking-[0.3em] text-blue-300">ASSET ROSTER</div>
                {autoRosterPlayers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {autoRosterPlayers.map((player) => (
                      <span key={`auto-roster-${player}`} className="border border-blue-800/60 bg-blue-950/30 px-2 py-1 text-xs text-blue-100">
                        {player}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Drop player avatars into `public/assets/players` to populate the roster automatically.
                  </p>
                )}
              </div>
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

>>>>>>> Stashed changes
            <div className="w-full group">
              <label htmlFor="bulkInput" className="block text-xl text-red-500 mb-2 font-bold tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>馃 鎵归噺鏅鸿兘閮ㄧ讲 (SMART DEPLOY)</label>
              <p className="text-xs text-neutral-400 mb-2">姣忚杈撳叆涓€鍦哄鍐筹紝鏍煎紡锛氶€夋墜A vs 閫夋墜B (渚嬪锛歋ol vs Ky)</p>
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
              馃摑 鎿嶄綔璁板綍鏃ュ織 (ACTION LOGS)
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
                馃攽 閫氳瀵嗛挜绠＄悊 (ACCESS CODES)
              </h2>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  const unused = invites.filter((i: any) => !i.used).map((i: any) => i.code).join('\n');
                  if (unused) {
                    if (navigator.clipboard && window.isSecureContext) {
                      navigator.clipboard.writeText(unused).then(() => {
                        alert("瀵嗛挜宸插鍒讹紒");
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
                        alert("瀵嗛挜宸插鍒讹紒");
                      } catch (error) {
                        console.error("Fallback copy failed", error);
                      } finally {
                        textArea.remove();
                      }
                    }
                  } else {
                    alert("鏃犲彲鐢ㄥ瘑閽?");
                  }
                }}
                className="ggst-button px-6 py-2 border-green-500 hover:bg-green-600 text-lg text-green-100"
                style={{ boxShadow: "4px 4px 0px 0px rgba(34, 197, 94, 0.8)" }}
              >
                [ 馃搵 涓€閿鍒舵墍鏈夋湭浣跨敤瀵嗛挜 ]
              </button>
              <button
                onClick={handleGenerateInvite}
                disabled={isGeneratingInvite}
                className="ggst-button px-6 py-2 border-yellow-500 hover:bg-yellow-600 text-lg"
                style={{ boxShadow: "4px 4px 0px 0px rgba(234, 179, 8, 0.8)" }}
              >
                {isGeneratingInvite ? "..." : "鐢熸垚鏂板瘑閽?(GENERATE)"}
              </button>
            </div>
          </div>

          <div className="transform skew-x-2">
            {invites.length === 0 ? (
              <p className="text-neutral-500 font-mono text-sm">鏆傛棤鏈娇鐢ㄧ殑閭€璇风爜</p>
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
                          [澶嶅埗]
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
              馃洅 榛戝競璁㈠崟澶勭悊 (BLACK MARKET ORDERS)
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
                            {fulfillingId === p.id ? "PROCESSING..." : "[ 鉁?灞ヨ瀹屾瘯 (MARK FULFILLED) ]"}
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
          <span className="text-yellow-500 animate-pulse">●</span> 进行中对局
        </h2>
        {activeMatches.length === 0 ? (
          <div className="text-center py-14 bg-black/60 border-2 border-neutral-800 border-dashed text-neutral-500 font-bold text-xl relative z-10 transform -skew-x-2 shadow-[8px_8px_0px_rgba(0,0,0,0.5)]" style={{ fontFamily: "var(--font-bebas)" }}>
            [ 暂无进行中对局 ]
          </div>
        ) : (
          <div className="grid gap-3 mb-12 relative z-10">
            <AnimatePresence>
              {activeMatches.map((match) => {
                const stageLabel = match.stageType === "BRACKET" ? "淘汰赛" : "小组赛";
                const bettingClosed = Boolean(match.bettingClosed || hasScheduledBettingClosed(match));
                const statusLabel = match.status === "LOCKED" ? "未开盘" : bettingClosed ? "已封盘" : "可下注";
                const statusTone =
                  match.status === "LOCKED"
                    ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
                    : bettingClosed
                      ? "border-red-500/40 bg-red-500/10 text-red-200"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";

                return (
                  <motion.div
                    key={match.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="bg-black/85 border border-neutral-700/90 px-3 py-3 transform -skew-x-2 shadow-[8px_8px_0px_rgba(0,0,0,0.45)]"
                  >
                    <div className="transform skew-x-2">
                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase">
                            <span className="border border-neutral-600 bg-neutral-900 px-2 py-1 text-neutral-200">{stageLabel}</span>
                            <span className={`border px-2 py-1 ${statusTone}`}>{statusLabel}</span>
                            <span className="border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100 normal-case tracking-[0.12em]">
                              {formatBettingCloseLabel(match)}
                            </span>
                          </div>

                          <div
                            className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center"
                            style={{ fontFamily: "var(--font-bebas)" }}
                          >
                            <div className="min-w-0 truncate text-right text-[1.8rem] leading-none text-red-500" title={match.playerA}>
                              {match.playerA}
                            </div>
                            <div className="justify-self-center border border-neutral-700 bg-neutral-950 px-3 py-1 text-lg font-black italic tracking-[0.16em] text-white shadow-[3px_3px_0px_rgba(127,29,29,0.85)]">
                              VS
                            </div>
                            <div className="min-w-0 truncate text-left text-[1.8rem] leading-none text-blue-400" title={match.playerB}>
                              {match.playerB}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                          <button
                            onClick={() => handleUnlockMatch(match.id)}
                            disabled={match.status !== "LOCKED"}
                            className="ggst-button min-w-[82px] px-3 py-2 border-yellow-500 text-xs hover:bg-yellow-600 disabled:border-neutral-700 disabled:text-neutral-500 disabled:hover:bg-transparent"
                          >
                            开盘
                          </button>
                          <button
                            onClick={() => handleSettleMatchPrompt(match.id, "A", match.playerA)}
                            disabled={match.status === "LOCKED" || settlingMatchId === match.id || deletingMatchId === match.id}
                            className="ggst-button min-w-[82px] px-3 py-2 border-red-500 text-xs hover:bg-red-600"
                          >
                            {settlingMatchId === match.id ? "..." : "A 胜"}
                          </button>
                          <button
                            onClick={() => handleSettleMatchPrompt(match.id, "B", match.playerB)}
                            disabled={match.status === "LOCKED" || settlingMatchId === match.id || deletingMatchId === match.id}
                            className="ggst-button min-w-[82px] px-3 py-2 border-blue-500 text-xs hover:bg-blue-600"
                          >
                            {settlingMatchId === match.id ? "..." : "B 胜"}
                          </button>
                          <button
                            onClick={() => openClosePanel(match)}
                            className={`ggst-button min-w-[82px] px-3 py-2 text-xs ${
                              closeMatchId === match.id
                                ? "border-red-500 bg-red-900/60 text-white"
                                : "border-red-500/70 hover:bg-red-700/60"
                            }`}
                          >
                            封盘
                          </button>
                          <button
                            onClick={() => {
                              setSettleMatchInfo(null);
                              setCloseMatchId(null);
                              setInjectMatchId(match.id);
                            }}
                            className={`ggst-button min-w-[82px] px-3 py-2 text-xs ${
                              injectMatchId === match.id
                                ? "border-purple-500 bg-purple-700/60 text-white"
                                : "border-purple-500 hover:bg-purple-600"
                            }`}
                          >
                            注池
                          </button>
                          <button
                            onClick={() => handleDeleteMatch(match.id)}
                            disabled={settlingMatchId === match.id || deletingMatchId === match.id}
                            className="ggst-button min-w-[82px] px-3 py-2 border-neutral-500 text-xs hover:bg-neutral-700 bg-neutral-900 text-neutral-200"
                          >
                            {deletingMatchId === match.id ? "..." : "撤销"}
                          </button>
                        </div>
                      </div>

                      {closeMatchId === match.id && (
                        <div className="mt-4 border-t border-neutral-700/60 pt-4">
                          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold tracking-[0.18em] text-red-300">封盘设置</span>
                                <span className="text-[11px] tracking-[0.12em] text-neutral-500">三种方式统一写入封盘时间，封盘后本场将无法下注。</span>
                              </div>

                              <div className="mt-3 grid gap-2 md:grid-cols-3">
                                {bettingCloseModeOptions.map((option) => (
                                  <button
                                    key={option.mode}
                                    onClick={() => setBetCloseMode(option.mode)}
                                    className={`border px-3 py-3 text-left transition-colors ${
                                      betCloseMode === option.mode
                                        ? "border-red-500 bg-red-900/45 text-white"
                                        : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:bg-neutral-900"
                                    }`}
                                  >
                                    <div className="text-sm font-bold tracking-[0.14em]">{option.label}</div>
                                    <div className="mt-1 text-[11px] tracking-[0.08em] text-neutral-500">{option.hint}</div>
                                  </button>
                                ))}
                              </div>

                              {betCloseMode === "IMMEDIATE" && (
                                <p className="mt-3 text-xs tracking-[0.12em] text-neutral-400">
                                  保存后立即封盘，本场从当前时刻起无法继续下注。
                                </p>
                              )}

                              {betCloseMode === "DELAY" && (
                                <div className="mt-3 max-w-xs">
                                  <label className="mb-1 block text-xs font-bold tracking-[0.14em] text-neutral-400">封盘分钟数</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={betCloseDelayMinutes}
                                    onChange={(e) => setBetCloseDelayMinutes(e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-600 px-3 py-2 text-white font-mono"
                                    placeholder="例如 15"
                                  />
                                </div>
                              )}

                              {betCloseMode === "AT" && (
                                <div className="mt-3 max-w-sm">
                                  <label className="mb-1 block text-xs font-bold tracking-[0.14em] text-neutral-400">封盘时间</label>
                                  <input
                                    type="datetime-local"
                                    value={betCloseAt}
                                    onChange={(e) => setBetCloseAt(e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-600 px-3 py-2 text-white font-mono"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 xl:flex-col xl:min-w-[9rem]">
                              <button
                                onClick={() => handleSetBettingClose(match.id)}
                                disabled={closingMatchId === match.id}
                                className="ggst-button px-4 py-2 border-red-500 bg-red-600 text-white hover:bg-red-500"
                              >
                                {closingMatchId === match.id ? "..." : "确认封盘"}
                              </button>
                              {match.bettingClosesAt && (
                                <button
                                  onClick={() => handleClearBettingClose(match.id)}
                                  disabled={closingMatchId === match.id}
                                  className="ggst-button px-4 py-2 border-emerald-500 text-emerald-300 hover:bg-emerald-600/20"
                                >
                                  取消封盘
                                </button>
                              )}
                              <button
                                onClick={() => setCloseMatchId(null)}
                                className="ggst-button px-4 py-2 border-neutral-600 text-neutral-300 hover:bg-neutral-800"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {settleMatchInfo?.id === match.id && (
                        <div className="mt-4 border-t border-neutral-700/60 pt-4">
                          <h4 className="text-white font-bold tracking-[0.14em] mb-2">结算比分</h4>
                          <p className="text-neutral-400 text-sm mb-4">
                            胜者：
                            <span className={settleMatchInfo.winner === "A" ? "text-red-500 font-bold" : "text-blue-400 font-bold"}>
                              {settleMatchInfo.pName}
                            </span>
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-neutral-400 text-xs mb-1 font-bold tracking-[0.14em]">A 方比分</label>
                              <input
                                type="number"
                                min="0"
                                value={scoreA}
                                onChange={(e) => setScoreA(e.target.value)}
                                className="w-full bg-neutral-950 border border-red-900/50 p-2 text-white font-mono"
                                placeholder="例如 3"
                              />
                            </div>
                            <div>
                              <label className="block text-neutral-400 text-xs mb-1 font-bold tracking-[0.14em]">B 方比分</label>
                              <input
                                type="number"
                                min="0"
                                value={scoreB}
                                onChange={(e) => setScoreB(e.target.value)}
                                className="w-full bg-neutral-950 border border-blue-900/50 p-2 text-white font-mono"
                                placeholder="例如 1"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={executeSettleMatch}
                              className="ggst-button flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2"
                            >
                              确认结算
                            </button>
                            <button
                              onClick={() => setSettleMatchInfo(null)}
                              className="ggst-button px-4 border-neutral-600 text-neutral-300 hover:bg-neutral-800"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )}

                      {injectMatchId === match.id && (
                        <div className="mt-4 border-t border-neutral-700/60 pt-4">
                          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
                            <div>
                              <label className="mb-1 block text-xs font-bold tracking-[0.14em] text-purple-300">A 方注池</label>
                              <input
                                type="number"
                                className="w-full bg-black border border-purple-500 text-white px-3 py-2 font-mono"
                                value={injectA}
                                onChange={(e) => setInjectA(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold tracking-[0.14em] text-purple-300">B 方注池</label>
                              <input
                                type="number"
                                className="w-full bg-black border border-purple-500 text-white px-3 py-2 font-mono"
                                value={injectB}
                                onChange={(e) => setInjectB(e.target.value)}
                              />
                            </div>
                            <button
                              onClick={() => handleInjectFunds(match.id)}
                              className="ggst-button px-4 py-2 border-purple-500 bg-purple-500 text-black font-bold hover:bg-purple-400"
                            >
                              确认注池
                            </button>
                            <button
                              onClick={() => setInjectMatchId(null)}
                              className="ggst-button px-4 py-2 border-neutral-600 text-neutral-300 hover:bg-neutral-800"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        {/* Settled Matches Section */}
        <h2 className="text-3xl font-bold mb-6 text-neutral-500 flex items-center gap-2 border-t-2 border-neutral-800 pt-8 relative z-10 tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
           鈮?ARCHIVED RECORDS
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
            鈿狅笍 {showGodMode ? "DISABLE" : "ENABLE"} GOD MODE (SYSTEM CONTROLS) 鈿狅笍
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
                  <span className="animate-pulse">鈿欙笍</span> SYSTEM CONTROLS
                </h2>

                <div className="transform skew-x-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Settings */}
                  <div className="border border-red-900 p-6 bg-black/50">
                    <h3 className="text-2xl font-bold text-white mb-4 border-b border-red-900 pb-2 flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)" }}>鈿欙笍 鍏ㄥ眬鏈哄埗鎺у埗 (SYSTEM CONTROLS)</h3>
                    <div className="space-y-4">
                      {/* Explicit Defined Settings */}
                      <div className="bg-red-950/20 p-4 border border-red-900/50 rounded shadow-inner mb-6">
                        <h4 className="text-lg font-bold text-red-400 mb-4 border-b border-red-900/50 pb-2">鍔ㄦ€侀檺棰濆弬鏁?(Betting Limits)</h4>
                        {["GROUP_MAX", "KO_PERCENT", "KO_MIN"].map(key => {
                          const setting = settings.find(s => s.key === key) || { key, value: key === "GROUP_MAX" ? "300" : key === "KO_PERCENT" ? "50" : "200" };
                          return (
                            <div key={key} className="flex justify-between items-center bg-black/50 p-2 border border-red-900/30 mb-2">
                              <span className="font-mono text-red-200">
                                {key === "GROUP_MAX" ? "灏忕粍璧涢檺棰?(GROUP_MAX)" : key === "KO_PERCENT" ? "娣樻卑璧涙瘮渚?(KO_PERCENT)" : "娣樻卑璧涗繚搴?(KO_MIN)"}
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
                            alert("闄愰鍙傛暟宸蹭繚瀛橈紒");
                          }}
                        >
                          馃捑 淇濆瓨闄愰鍙傛暟
                        </button>
                      </div>

                      {settings.filter(s => !["GROUP_MAX", "KO_PERCENT", "KO_MIN", "GROUP_STAGE_LIMIT", "KNOCKOUT_PERCENT", "KNOCKOUT_MIN"].includes(s.key)).map(s => (
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
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)" }}>馃懃 浜轰簨涓庢暟鎹簱绠＄悊 (DATABASE MANAGER)</h3>
                      <button
                        onClick={handleCrawlAvatars}
                        disabled={isCrawlingAvatars}
                        className="ggst-button px-4 py-2 border-purple-500 text-sm hover:bg-purple-600 bg-purple-900 text-purple-200 shadow-[2px_2px_0px_rgba(168,85,247,0.8)]"
                      >
                        {isCrawlingAvatars ? "CRAWLING..." : "馃摳 鍏ㄨ嚜鍔ㄦ姄鍙栭€夋墜鐪熷 (CRAWL AVATARS)"}
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
<<<<<<< Updated upstream
}
=======
}


>>>>>>> Stashed changes
