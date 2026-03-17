"use client";

import { useEffect, useState, useMemo, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import confetti from "canvas-confetti";
import AppLayout from "@/components/AppLayout";
import PlayerAvatar from "@/components/PlayerAvatar";
import { EMPTY_CLIENT_ASSET_CATALOG, loadAssetCatalog, resolveAssetUrl } from "@/lib/client-asset-catalog";
import { parseBettingCloseDate } from "@/lib/match-betting";
import { validateFatalPrediction } from "@/lib/bet-effects";

interface Bet {
  id: string;
  userId: string;
  matchId: string;
  amount: number;
  choice: "A" | "B";
  comment?: string;
  usedFdShield?: boolean;
  usedFatalCounter?: boolean;
  predictedScoreA?: number | null;
  predictedScoreB?: number | null;
  user: {
    username: string;
    displayName?: string;
    nameColor?: string;
  };
}

interface Match {
  id: string;
  playerA: string;
  playerB: string;
  charA?: string | null;
  charB?: string | null;
  status: string;
  winner?: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
  stageType?: string | null;
  bets?: Bet[];
  poolA: number;
  poolB: number;
  bettingClosesAt?: string | null;
  bettingClosed?: boolean;
}

interface LeaderboardEntry {
  id: string;
  displayName: string;
  nameColor?: string;
  points: number;
}

interface UserInventory {
  fdShields: number;
  fatalCounters: number;
}

function MatchCard({
  match,
  userId,
  points,
  userInventory,
  sysSettings,
  fetchUserPoints,
  fetchMatches,
  setError,
  setPoints,
  setWelfareMsg,
}: any) {
  const [betAmount, setBetAmount] = useState<number | "">("");
  const [betComment, setBetComment] = useState("");
  const [isBetting, setIsBetting] = useState(false);
  const [previewChoice, setPreviewChoice] = useState<"A" | "B" | null>(null);
  const [betModalChoice, setBetModalChoice] = useState<"A" | "B" | null>(null);
  const [useFdShield, setUseFdShield] = useState(false);
  const [useFatalCounter, setUseFatalCounter] = useState(false);
  const [predictedScoreA, setPredictedScoreA] = useState<number | "">("");
  const [predictedScoreB, setPredictedScoreB] = useState<number | "">("");
  const [catalog, setCatalog] = useState(EMPTY_CLIENT_ASSET_CATALOG);

  useEffect(() => {
    let cancelled = false;

    loadAssetCatalog().then((result) => {
      if (!cancelled) {
        setCatalog(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const resetBetOptions = () => {
    setUseFdShield(false);
    setUseFatalCounter(false);
    setPredictedScoreA("");
    setPredictedScoreB("");
    setBetModalChoice(null);
    setPreviewChoice(null);
  };

  const selectedItemLabels = [
    useFdShield ? "FD 保连胜" : null,
    useFatalCounter
      ? `致命打康 ${predictedScoreA === "" ? "?" : predictedScoreA}-${predictedScoreB === "" ? "?" : predictedScoreB}`
      : null,
  ].filter(Boolean) as string[];

  const handleBet = async (choice: "A" | "B") => {
    setError(null);
    const amount = Number(betAmount) || 0;
    const comment = betComment || "";
    const predictionError = useFatalCounter
      ? validateFatalPrediction({
          choice,
          predictedScoreA: predictedScoreA === "" ? null : Number(predictedScoreA),
          predictedScoreB: predictedScoreB === "" ? null : Number(predictedScoreB),
        })
      : null;

    if (bettingClosed) return setError("该对局已封盘，无法继续下注");
    if (amount <= 0) return setError("下注金额必须大于 0");
    if (amount > points) return setError("余额不足，请输入更小的金额");
    if (predictionError) return setError(predictionError);

    const previousPoints = points;
    setPoints((prev: number) => prev - amount);
    setIsBetting(true);

    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          matchId: match.id,
          choice,
          amount,
          comment,
          useFdShield,
          useFatalCounter,
          predictedScoreA: useFatalCounter ? Number(predictedScoreA) : null,
          predictedScoreB: useFatalCounter ? Number(predictedScoreB) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPoints(previousPoints);
        setError(data.error || "下注失败");
      } else {
        fetchUserPoints(userId);
        fetchMatches();
        setBetAmount("");
        setBetComment("");
        resetBetOptions();
      }
    } catch (err) {
      console.error("Bet error:", err);
      setPoints(previousPoints);
      setError("网络连接中断，请稍后重试");
    } finally {
      setIsBetting(false);
    }
  };

  const handleCancelBet = async (originalAmount: number) => {
    setError(null);
    if (bettingClosed) return setError("该对局已封盘，无法撤回下注");
    if (!confirm(`确定要撤回这笔下注吗？\n将扣除 5% 手续费，预计退还 ${Math.floor(originalAmount * 0.95)} W$。`)) return;

    try {
      const res = await fetch("/api/bets/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, matchId: match.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "撤回下注失败");
      } else {
        fetchUserPoints(userId);
        fetchMatches();
        if (setWelfareMsg) {
          const restoredParts = [
            data.restoredFdShield ? "已返还 FD 护盾" : null,
            data.restoredFatalCounter ? "已返还致命打康" : null,
          ].filter(Boolean);
          const restoredSuffix = restoredParts.length > 0 ? `，${restoredParts.join("，")}` : "";
          setWelfareMsg(`下注已撤回，退还 ${data.refund} W$（已扣除 5%）${restoredSuffix}`);
          setTimeout(() => setWelfareMsg(null), 4000);
        }
      }
    } catch (err) {
      console.error("Cancel bet error:", err);
      setError("网络错误，暂时无法撤回下注");
    }
  };

  const setQuickAmount = (amt: number | "ALL") => {
    let limit = 500;
    if (match.stageType === "GROUP") limit = sysSettings.GROUP_MAX;
    else if (match.stageType === "BRACKET") limit = Math.max(sysSettings.KO_MIN, Math.floor(points * (sysSettings.KO_PERCENT / 100)));
    const finalAmt = amt === "ALL" ? Math.min(points, limit) : Math.min(amt, limit);
    setBetAmount(finalAmt);
  };

  const openBetModal = (choice: "A" | "B") => {
    const amount = Number(betAmount) || 0;

    setError(null);
    if (bettingClosed) return setError("该对局已封盘，无法继续下注");
    if (amount <= 0) return setError("下注金额必须大于 0");
    if (amount > points) return setError("余额不足，请输入更小的金额");

    setBetModalChoice(choice);
    setPreviewChoice(choice);
  };

  const poolA = match.poolA || 0;
  const poolB = match.poolB || 0;
  const totalPool = poolA + poolB;
  const poolAPercent = totalPool === 0 ? 50 : (poolA / totalPool) * 100;
  const poolBPercent = 100 - poolAPercent;
  const userBet = match.bets?.find((b: any) => b.userId === userId) ?? null;
  const hasUserBet = Boolean(userBet);
  const bettingClosed = Boolean(match.bettingClosed);
  const canBet = match.status === "OPEN" && !bettingClosed;
  const activeChoice = previewChoice ?? userBet?.choice ?? null;
  const visualUrlA = resolveAssetUrl(catalog.players.urls, match.playerA) ?? resolveAssetUrl(catalog.characters.urls, match.charA);
  const visualUrlB = resolveAssetUrl(catalog.players.urls, match.playerB) ?? resolveAssetUrl(catalog.characters.urls, match.charB);
  const bettingClosesAt = parseBettingCloseDate(match.bettingClosesAt);
  const fatalPredictionError =
    betModalChoice && useFatalCounter
      ? validateFatalPrediction({
          choice: betModalChoice,
          predictedScoreA: predictedScoreA === "" ? null : Number(predictedScoreA),
          predictedScoreB: predictedScoreB === "" ? null : Number(predictedScoreB),
        })
      : null;

  const currentLimit = (() => {
    if (match.stageType === "GROUP") return Math.min(points, sysSettings.GROUP_MAX);
    if (match.stageType === "BRACKET") {
      return Math.min(points, Math.max(sysSettings.KO_MIN, Math.floor(points * (sysSettings.KO_PERCENT / 100))));
    }
    return Math.min(points, 500);
  })();

  const betLimitText = (() => {
    const closeText = bettingClosed
      ? "已封盘"
      : bettingClosesAt
        ? `封盘 ${bettingClosesAt.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`
        : null;

    const baseText = (() => {
      if (match.stageType === "GROUP") return `下注上限 ${sysSettings.GROUP_MAX} W$`;
      if (match.stageType === "BRACKET") return `下注上限 ${currentLimit} W$ / 保底 ${sysSettings.KO_MIN}`;
      return `下注上限 ${currentLimit} W$`;
    })();

    return closeText ? `${baseText} / ${closeText}` : baseText;
  })();

  const betPlaceholderText = `输入押注金额...（上限 ${currentLimit}）`;
  const numericBetAmount = typeof betAmount === "number" ? betAmount : Number(betAmount) || 0;
  const betHeatRatio = currentLimit > 0 ? Math.min(1, Math.max(0, numericBetAmount / currentLimit)) : 0;
  const betHeatBand = betHeatRatio >= 0.75 ? 4 : betHeatRatio >= 0.5 ? 3 : betHeatRatio >= 0.25 ? 2 : 1;
  const betHeatLabel =
    betHeatRatio >= 0.75
      ? "OVERDRIVE"
      : betHeatRatio >= 0.5
        ? "HIGH HEAT"
        : betHeatRatio >= 0.25
          ? "WARM UP"
          : "LOW HEAT";
  const betHeatPercent = Math.round(betHeatRatio * 100);
  const betHeatClassName = [
    `ggst-bet-panel--heat-${betHeatBand}`,
    activeChoice === "A" ? "ggst-bet-panel--target-a" : "",
    activeChoice === "B" ? "ggst-bet-panel--target-b" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const betHeatStyle = {
    ["--ggst-bet-heat-ratio" as string]: `${betHeatRatio}`,
    ["--ggst-bet-heat-percent" as string]: `${betHeatPercent}%`,
  } as CSSProperties;

  const stageChip = (() => {
    if (match.stageType === "GROUP") return "分组";
    if (match.stageType === "BRACKET") return "淘汰";
    return "对局";
  })();

  const getFighterNameStyle = (name: string): CSSProperties => {
    const compactName = name.replace(/\s+/g, "");
    const visualLength = Array.from(compactName).reduce((total, char) => {
      if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/i.test(char)) return total + 1.08;
      if (/[A-Z0-9]/.test(char)) return total + 0.82;
      if (/[a-z]/.test(char)) return total + 0.72;
      return total + 0.78;
    }, 0);

    let fontSize = "clamp(2.62rem, 5.3vw, 3.58rem)";
    let letterSpacing = "0.05em";

    if (visualLength <= 2.4) {
      fontSize = "clamp(2.74rem, 5.5vw, 3.7rem)";
      letterSpacing = "0.14em";
    } else if (visualLength <= 4.2) {
      fontSize = "clamp(2.62rem, 5.2vw, 3.42rem)";
      letterSpacing = "0.09em";
    } else if (visualLength <= 6.8) {
      fontSize = "clamp(2.42rem, 4.8vw, 3.18rem)";
      letterSpacing = "0.06em";
    } else if (visualLength <= 9.2) {
      fontSize = "clamp(2.18rem, 4.3vw, 2.86rem)";
      letterSpacing = "0.04em";
    } else if (visualLength <= 11.5) {
      fontSize = "clamp(1.94rem, 3.95vw, 2.54rem)";
      letterSpacing = "0.03em";
    } else {
      fontSize = "clamp(1.72rem, 3.45vw, 2.16rem)";
      letterSpacing = "0.015em";
    }

    return {
      ["--ggst-fighter-name-size" as string]: fontSize,
      ["--ggst-fighter-name-track" as string]: letterSpacing,
    };
  };

  const clashMeterStyle: CSSProperties = {
    ["--clash-a-width" as string]: `${poolAPercent}%`,
    ["--clash-b-width" as string]: `${poolBPercent}%`,
  };

  return (
    <motion.div
      id={`match-${match.id}`}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`ggst-clash-card scroll-mt-24 ${match.status === "OPEN" ? "ggst-clash-card--open" : "ggst-clash-card--settled"} ${activeChoice === "A" ? "ggst-clash-card--focus-a" : ""} ${activeChoice === "B" ? "ggst-clash-card--focus-b" : ""}`}
    >
      <div className="bg-noise absolute inset-0 z-0 opacity-[0.03]" />
      <div className="ggst-card-visuals" aria-hidden="true">
        {visualUrlA && (
          <div className="ggst-card-visual ggst-card-visual--a">
            <img src={visualUrlA} alt="" className="ggst-card-visual__image" />
          </div>
        )}
        {visualUrlB && (
          <div className="ggst-card-visual ggst-card-visual--b">
            <img src={visualUrlB} alt="" className="ggst-card-visual__image" />
          </div>
        )}
        <div className="ggst-card-visuals__vignette" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <div className="pointer-events-none absolute left-0 top-0 z-20 h-10 w-10 border-l-4 border-t-4 border-white/90" />

      {match.status === "SETTLED" && (
        <div
          className="absolute right-0 top-0 z-20 border-b-2 border-l-2 border-yellow-300 bg-yellow-400 px-4 py-1 text-black shadow-[-4px_4px_0px_rgba(234,179,8,0.25)]"
          style={{ fontFamily: "var(--font-bebas)", fontSize: "1.1rem" }}
        >
          胜者：{match.winner}
        </div>
      )}

      {match.status === "OPEN" && bettingClosed && (
        <div
          className="absolute right-0 top-0 z-20 border-b-2 border-l-2 border-red-500 bg-red-900 px-4 py-1 text-white shadow-[-4px_4px_0px_rgba(125,32,37,0.35)]"
          style={{ fontFamily: "var(--font-bebas)", fontSize: "1.05rem" }}
        >
          已封盘
        </div>
      )}

      {canBet && (() => {
        const total = (match.poolA || 0) + (match.poolB || 0);
        if (total <= 1000 || !match.poolA || !match.poolB) return null;
        const ratio = (match.poolA || 0) / (match.poolB || 1);
        if (ratio < 9 && ratio > 1 / 9) return null;

        return (
          <div className="absolute -top-3 -right-3 rotate-12 z-50">
            <div className="bg-red-600 text-white text-xs font-black px-3 py-1 border-2 border-yellow-400 shadow-[0_0_15px_rgba(239,68,68,1)] animate-pulse whitespace-nowrap">
              逆风翻盘预警
            </div>
          </div>
        );
      })()}

      <div className="ggst-hero-plate">
        <div className="ggst-card-head relative z-10 mx-4 mb-4 mt-3 sm:mx-6">
          <div className="ggst-meter-summary">
            <div className="ggst-pool-readout ggst-pool-readout--a">
              <span className="ggst-pool-readout__label ggst-micro-plate ggst-micro-plate--pool">A 池</span>
              <strong className="ggst-pool-readout__value">{poolA.toLocaleString()} W$</strong>
            </div>
            <div className="ggst-meter-summary__center">
              <span className="ggst-meter-summary__chip ggst-micro-plate ggst-micro-plate--stage">{stageChip}</span>
              <strong className="ggst-meter-summary__total">{totalPool.toLocaleString()} W$</strong>
              <span className="ggst-meter-summary__split">{poolAPercent.toFixed(0)}% / {poolBPercent.toFixed(0)}%</span>
            </div>
            <div className="ggst-pool-readout ggst-pool-readout--b">
              <span className="ggst-pool-readout__label ggst-micro-plate ggst-micro-plate--pool">B 池</span>
              <strong className="ggst-pool-readout__value">{poolB.toLocaleString()} W$</strong>
            </div>
          </div>

          <div className="ggst-clash-meter" style={clashMeterStyle}>
            <div className="ggst-clash-meter__lane ggst-clash-meter__lane--a" />
            <div className="ggst-clash-meter__lane ggst-clash-meter__lane--b" />
            <div className="ggst-clash-meter__center-glow" />
            <div className="ggst-clash-meter__core" aria-hidden="true" />
          </div>
        </div>

        <div className="mx-4 mb-4 ggst-duel-zone sm:mx-6">
          <div className={`ggst-fighter-card ggst-fighter-card--a ${activeChoice === "A" ? "ggst-fighter-card--active" : activeChoice === "B" ? "ggst-fighter-card--muted" : ""}`}>
            <div className="ggst-fighter-card__portrait">
              <div className="ggst-fighter-card__avatar">
                <PlayerAvatar playerName={match.playerA} charName={match.charA} playerType="A" showCharBadge={false} />
              </div>
            </div>
            <div className="ggst-fighter-card__identity">
              <span className="ggst-fighter-card__side-tag ggst-micro-plate ggst-micro-plate--fighter">选手 A</span>
              <h3 className="ggst-fighter-card__name">
                <span className="ggst-fighter-card__name-text" style={getFighterNameStyle(match.playerA)}>
                  {match.playerA}
                </span>
              </h3>
              {match.charA && <span className="ggst-fighter-card__detail">{match.charA}</span>}
            </div>
          </div>

          <div className="ggst-matchup-vs">
            {match.status === "SETTLED" && typeof match.scoreA === "number" && typeof match.scoreB === "number" ? (
              <span className="ggst-matchup-vs__score">{match.scoreA} - {match.scoreB}</span>
            ) : (
              <span className="ggst-matchup-vs__versus">VS</span>
            )}
          </div>

          <div className={`ggst-fighter-card ggst-fighter-card--b ${activeChoice === "B" ? "ggst-fighter-card--active" : activeChoice === "A" ? "ggst-fighter-card--muted" : ""}`}>
            <div className="ggst-fighter-card__portrait">
              <div className="ggst-fighter-card__avatar">
                <PlayerAvatar playerName={match.playerB} charName={match.charB} playerType="B" showCharBadge={false} />
              </div>
            </div>
            <div className="ggst-fighter-card__identity">
              <span className="ggst-fighter-card__side-tag ggst-micro-plate ggst-micro-plate--fighter">选手 B</span>
              <h3 className="ggst-fighter-card__name">
                <span className="ggst-fighter-card__name-text" style={getFighterNameStyle(match.playerB)}>
                  {match.playerB}
                </span>
              </h3>
              {match.charB && <span className="ggst-fighter-card__detail">{match.charB}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="ggst-control-module">
      {match.status === "OPEN" && (
        <div className={`mx-4 ggst-bet-panel ${betHeatClassName} sm:mx-6`} style={betHeatStyle}>
          {hasUserBet && canBet && (
            <div className="mb-3">
              <button
                onClick={() => {
                  if (userBet) handleCancelBet(userBet.amount);
                }}
                className="ggst-mini-action ggst-mini-action--block"
                style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.14em" }}
              >
                撤回下注（-5%）
              </button>
            </div>
          )}

          {bettingClosed ? (
            <div className="ggst-bet-panel__closed">
              <div className="ggst-bet-panel__closed-title">本场已封盘</div>
              <p className="ggst-bet-panel__closed-text">
                比赛开始后已停止下注{userBet ? "，你已有的下注会保留到结算。" : "。"}
              </p>
            </div>
          ) : (
            <>
              <div className="ggst-bet-panel__top">
                <div className="ggst-bet-panel__heading">
                  <label htmlFor={`bet-amount-${match.id}`} className="ggst-bet-panel__label">押注</label>
                  <span className="ggst-bet-panel__hint">{betLimitText}</span>
                </div>
                <div className="ggst-bet-panel__tools">
                  {[100, 500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setQuickAmount(amt)}
                      className="ggst-quick-chip"
                      aria-label={`快速押注 ${amt} W$`}
                    >
                      +{amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setQuickAmount("ALL")}
                    className="ggst-quick-chip ggst-quick-chip--all"
                    aria-label="最大押注"
                  >
                    最大押注
                  </button>
                </div>
              </div>

              <div className="ggst-bet-panel__thermo" aria-hidden="true">
                <span className={`ggst-bet-panel__thermo-badge ggst-bet-panel__thermo-badge--${betHeatBand}`}>
                  {betHeatLabel}
                </span>
                <div className="ggst-bet-panel__thermo-track">
                  <span className="ggst-bet-panel__thermo-fill" />
                </div>
                <span className="ggst-bet-panel__thermo-value">{betHeatPercent}%</span>
              </div>

              <div className="ggst-bet-fields">
                <input
                  id={`bet-amount-${match.id}`}
                  type="number"
                  min="0"
                  max={currentLimit}
                  value={betAmount}
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 0;
                    let limit = 500;
                    if (match.stageType === "GROUP") limit = sysSettings.GROUP_MAX;
                    else if (match.stageType === "BRACKET") limit = Math.max(sysSettings.KO_MIN, Math.floor(points * (sysSettings.KO_PERCENT / 100)));
                    if (val > limit) val = limit;
                    setBetAmount(val === 0 ? "" : val);
                  }}
                  placeholder={betPlaceholderText}
                  className="ggst-bet-input"
                />

                <input
                  type="text"
                  value={betComment}
                  onChange={(e) => setBetComment(e.target.value)}
                  placeholder="赛事分析 / 留言（可选）..."
                  maxLength={50}
                  className="ggst-comment-input"
                />
              </div>

              <div className="ggst-bet-actions">
                <button
                  onClick={() => openBetModal("A")}
                  disabled={isBetting || !betAmount}
                  className={`ggst-choice-button ggst-choice-button--a ${activeChoice === "A" ? "ggst-choice-button--selected" : ""} ${activeChoice === "B" ? "ggst-choice-button--muted" : ""}`}
                  aria-label={`押注 ${match.playerA}`}
                  aria-pressed={activeChoice === "A"}
                  onMouseEnter={() => setPreviewChoice("A")}
                  onMouseLeave={() => setPreviewChoice(null)}
                  onFocus={() => setPreviewChoice("A")}
                  onBlur={() => setPreviewChoice(null)}
                >
                  {isBetting ? (
                    <span className="ggst-choice-button__name">...</span>
                  ) : (
                    <>
                      <span className="ggst-choice-button__prefix">押注</span>
                      <span className="ggst-choice-button__name">{match.playerA}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => openBetModal("B")}
                  disabled={isBetting || !betAmount}
                  className={`ggst-choice-button ggst-choice-button--b ${activeChoice === "B" ? "ggst-choice-button--selected" : ""} ${activeChoice === "A" ? "ggst-choice-button--muted" : ""}`}
                  aria-label={`押注 ${match.playerB}`}
                  aria-pressed={activeChoice === "B"}
                  onMouseEnter={() => setPreviewChoice("B")}
                  onMouseLeave={() => setPreviewChoice(null)}
                  onFocus={() => setPreviewChoice("B")}
                  onBlur={() => setPreviewChoice(null)}
                >
                  {isBetting ? (
                    <span className="ggst-choice-button__name">...</span>
                  ) : (
                    <>
                      <span className="ggst-choice-button__prefix">押注</span>
                      <span className="ggst-choice-button__name">{match.playerB}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mx-4 mt-4 ggst-intel-feed sm:mx-6">
        <h4 className="ggst-intel-feed__title">
          <span className="ggst-intel-feed__label">战况动态</span>
        </h4>

        {!match.bets || match.bets.length === 0 ? (
          <div className="ggst-intel-feed__empty">
            <span className="ggst-intel-feed__empty-prefix">SYS</span>
            <span className="ggst-intel-feed__empty-text">&gt; [ 系统：暂无战况情报 ]_</span>
          </div>
        ) : (
          <div className="ggst-intel-feed__list">
            {match.bets.map((bet: Bet) => {
              const isRed = bet.choice === "A";
              const playerName = isRed ? match.playerA : match.playerB;

              return (
                <div key={bet.id} className={`ggst-intel-item ${isRed ? "ggst-intel-item--a" : "ggst-intel-item--b"}`}>
                  <div className="ggst-intel-item__meta">
                    <span
                      className="ggst-intel-item__user"
                      style={{
                        color: bet.user?.nameColor || "#ffffff",
                        textShadow: bet.user?.nameColor && bet.user.nameColor !== "#ffffff" ? `0 0 5px ${bet.user.nameColor}80` : undefined,
                      }}
                    >
                      {bet.user.displayName || bet.user.username}
                    </span>
                    <span className="ggst-intel-item__text">投入</span>
                    <span className="ggst-intel-item__amount">{bet.amount} W$</span>
                    <span className="ggst-intel-item__text">支持</span>
                    <span className={`ggst-intel-item__target ${isRed ? "ggst-intel-item__target--a" : "ggst-intel-item__target--b"}`}>{playerName}</span>
                    {bet.usedFdShield && (
                      <span className="rounded border border-amber-400/40 bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-amber-100">
                        FD 保连胜
                      </span>
                    )}
                    {bet.usedFatalCounter && (
                      <span className="rounded border border-red-500/40 bg-red-950/40 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-red-100">
                        打康预测 {bet.predictedScoreA ?? "?"}-{bet.predictedScoreB ?? "?"}
                      </span>
                    )}
                  </div>

                  {bet.comment && (
                    <div className="ggst-intel-item__comment">
                      <p>&quot;{bet.comment}&quot;</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      <AnimatePresence>
        {betModalChoice && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              className="w-full max-w-md border border-neutral-700 bg-[#15191f] p-5 shadow-[0_24px_42px_rgba(0,0,0,0.36)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#8a909a]">道具使用确认</div>
                  <h4 className="mt-1 text-3xl font-black text-[#f1ede4]" style={{ fontFamily: "var(--font-bebas)" }}>
                    押注 {betModalChoice === "A" ? match.playerA : match.playerB}
                  </h4>
                </div>
                <button
                  onClick={resetBetOptions}
                  className="text-sm text-[#b5aea3] transition hover:text-white"
                >
                  关闭
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="border border-neutral-800 bg-[#1b1f26] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#8a909a]">下注金额</div>
                  <div className="mt-1 text-2xl font-black text-[#f1ede4]" style={{ fontFamily: "var(--font-bebas)" }}>
                    {Number(betAmount || 0).toLocaleString()} W$
                  </div>
                </div>
                <div className="border border-neutral-800 bg-[#1b1f26] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#8a909a]">当前持有</div>
                  <div className="mt-1 text-sm leading-6 text-[#f1ede4]">
                    FD {userInventory.fdShields} / 打康 {userInventory.fatalCounters}
                  </div>
                </div>
              </div>

              <div className="mt-4 border border-[#2a2f37] bg-[#12161d] px-4 py-3 text-xs leading-6 text-[#b5aea3]">
                <div className="font-semibold text-[#f1ede4]">公开显示说明</div>
                <div className="mt-1">
                  正常下注会显示金额、支持对象和留言。使用 FD 或打康后，战况动态和个人资料会额外记录本次道具使用。
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="flex items-center justify-between gap-4 border border-neutral-800 bg-[#1b1f26] px-4 py-3 text-sm text-[#f1ede4]">
                  <div>
                    <div className="font-semibold">使用 FD 完美防御</div>
                    <div className="mt-1 text-xs text-[#8a909a]">押错后本金照扣，但连胜不清零。公开显示为“FD 保连胜”。</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={useFdShield}
                    disabled={userInventory.fdShields < 1}
                    onChange={(event) => setUseFdShield(event.target.checked)}
                    className="h-4 w-4 accent-[#be9b33]"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 border border-neutral-800 bg-[#1b1f26] px-4 py-3 text-sm text-[#f1ede4]">
                  <div>
                    <div className="font-semibold">使用致命打康</div>
                    <div className="mt-1 text-xs text-[#8a909a]">猜中胜负且比分完全一致，纯利润额外 +50%。预测比分会公开显示。</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={useFatalCounter}
                    disabled={userInventory.fatalCounters < 1}
                    onChange={(event) => setUseFatalCounter(event.target.checked)}
                    className="h-4 w-4 accent-[#c93b35]"
                  />
                </label>

                {useFatalCounter && (
                  <div className="border border-neutral-800 bg-[#1b1f26] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#8a909a]">预测比分</div>
                    <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        value={predictedScoreA}
                        onChange={(event) => setPredictedScoreA(event.target.value === "" ? "" : Number(event.target.value))}
                        className="border border-neutral-700 bg-[#111318] px-3 py-2 text-center text-lg font-black text-[#f1ede4] outline-none focus:border-red-400"
                        placeholder="A"
                      />
                      <span className="text-sm font-semibold text-[#8a909a]">:</span>
                      <input
                        type="number"
                        min="0"
                        value={predictedScoreB}
                        onChange={(event) => setPredictedScoreB(event.target.value === "" ? "" : Number(event.target.value))}
                        className="border border-neutral-700 bg-[#111318] px-3 py-2 text-center text-lg font-black text-[#f1ede4] outline-none focus:border-blue-400"
                        placeholder="B"
                      />
                    </div>
                    {fatalPredictionError && (
                      <div className="mt-3 text-xs text-red-300">{fatalPredictionError}</div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 border border-[#2a2f37] bg-[#111318] px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#8a909a]">本次附加效果</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedItemLabels.length > 0 ? (
                    selectedItemLabels.map((item) => (
                      <span
                        key={item}
                        className="border border-[#3c424c] bg-[#1a1f27] px-2 py-1 text-[11px] font-semibold text-[#f1ede4]"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#8a909a]">本次不使用额外道具。</span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={resetBetOptions}
                  className="border border-neutral-700 bg-[#171a20] px-4 py-3 text-sm font-semibold text-[#b5aea3] transition hover:text-white"
                >
                  取消
                </button>
                <button
                  onClick={() => handleBet(betModalChoice)}
                  disabled={isBetting || Boolean(fatalPredictionError)}
                  className="border border-red-500 bg-[#221214] px-5 py-3 text-base font-black tracking-[0.1em] text-[#f1ede4] transition hover:bg-[#31171a] disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-[#171a20] disabled:text-[#656b75]"
                  style={{ fontFamily: "var(--font-bebas)" }}
                >
                  {isBetting ? "提交中" : "确认下注"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState(0);
  const [userInventory, setUserInventory] = useState<UserInventory>({ fdShields: 0, fatalCounters: 0 });
  const [matches, setMatches] = useState<Match[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [betAmount, setBetAmount] = useState<Record<string, number>>({});
  const [betComment, setBetComment] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [welfareMsg, setWelfareMsg] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [isBetting, setIsBetting] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"OPEN" | "ALL" | "SETTLED">("OPEN");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [sysSettings, setSysSettings] = useState<{ GROUP_MAX: number, KO_PERCENT: number, KO_MIN: number }>({
    GROUP_MAX: 300,
    KO_PERCENT: 50,
    KO_MIN: 200
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        const newSettings = { GROUP_MAX: 300, KO_PERCENT: 50, KO_MIN: 200 };
        data.forEach((s: any) => {
          if (s.key === "GROUP_MAX") newSettings.GROUP_MAX = parseInt(s.value, 10);
          if (s.key === "KO_PERCENT") newSettings.KO_PERCENT = parseInt(s.value, 10);
          if (s.key === "KO_MIN") newSettings.KO_MIN = parseInt(s.value, 10);
        });
        setSysSettings(newSettings);
      }
    } catch (e) {
      console.error("Failed to fetch settings");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserId = localStorage.getItem("userId");
      const storedUsername = localStorage.getItem("username");
      const storedDisplayName = localStorage.getItem("displayName");

      if (!storedUserId) {
        router.push("/");
        return;
      }

      setUserId(storedUserId);
      setUsername(storedUsername || "未知用户");
      setDisplayName(storedDisplayName || storedUsername || "未知用户");
      setNewName(storedDisplayName || storedUsername || "未知用户");

      const initFetch = async () => {
        await fetchData(storedUserId);
        await fetchSettings();
        setIsInitialLoad(false);
      };

      initFetch();

      const intervalId = setInterval(() => {
        fetchMatches();
        fetchUserPoints(storedUserId);
        fetchLeaderboard();
        fetchSettings();
      }, 15000);

      return () => clearInterval(intervalId);
    }
  }, [router]);

  const fetchData = async (id: string = userId) => {
    setIsRefreshing(true);
    await Promise.all([fetchUserPoints(id), fetchMatches(), fetchLeaderboard()]);
    setTimeout(() => setIsRefreshing(false), 500); // Minimum animation time
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/users/leaderboard?limit=5");
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.users || data);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    }
  };

  const fetchUserPoints = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPoints(data.points);
        setUserInventory({
          fdShields: data.fdShields ?? 0,
          fatalCounters: data.fatalCounters ?? 0,
        });
        if (typeof window !== "undefined") localStorage.setItem("points", data.points.toString());
        if (typeof window !== "undefined" && data.winStreak !== undefined) localStorage.setItem("winStreak", data.winStreak.toString());
      }
    } catch (err) {
      console.error("Failed to fetch user points", err);
    }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      if (res.ok) setMatches(await res.json());
    } catch (err) {
      console.error("Failed to fetch matches", err);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") localStorage.clear();
    router.push("/");
  };

  const handleWelfare = async () => {
    try {
      const res = await fetch("/api/users/welfare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (res.ok) {
        setPoints(data.points);
        setError(null);
        setWelfareMsg(data.message);

        // Trigger Confetti!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ef4444', '#facc15', '#ffffff']
        });

        setTimeout(() => setWelfareMsg(null), 4000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error(err);
      setError("领取急救补助时网络异常，请稍后再试");
    }
  };


  const handleBet = async (matchId: string, choice: "A" | "B") => {
    setError(null);
    const amount = betAmount[matchId] || 0;
    const comment = betComment[matchId] || "";

    if (amount <= 0) return setError("下注金额必须大于 0");
    if (amount > points) return setError("余额不足，请输入更小的金额");

    // Optimistic Update
    const previousPoints = points;
    setPoints((prev) => prev - amount);
    setIsBetting((prev) => ({ ...prev, [matchId]: true }));

    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, matchId, choice, amount, comment }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Rollback on failure
        setPoints(previousPoints);
        setError(data.error || "下注失败");
      } else {
        // Sync with server on success
        fetchUserPoints(userId);
        fetchMatches(); // refresh match list to show updated bets
        setBetAmount((prev) => ({ ...prev, [matchId]: 0 }));
        setBetComment((prev) => ({ ...prev, [matchId]: "" }));
      }
    } catch (err) {
      console.error("Bet error:", err);
      // Rollback on network error
      setPoints(previousPoints);
      setError("网络连接中断，请稍后重试");
    } finally {
      setIsBetting((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  const handleCancelBet = async (matchId: string, originalAmount: number) => {
    setError(null);
    if (!confirm(`确定要撤回这笔下注吗？\n将扣除 5% 手续费，预计退还 ${Math.floor(originalAmount * 0.95)} W$。`)) return;

    try {
      const res = await fetch("/api/bets/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, matchId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "撤回下注失败");
      } else {
        // Sync with server on success
        fetchUserPoints(userId);
        fetchMatches(); // refresh match list
        setWelfareMsg(`下注已撤回，退还 ${data.refund} W$（已扣除 5%）`);
        setTimeout(() => setWelfareMsg(null), 4000);
      }
    } catch (err) {
      console.error("Cancel bet error:", err);
      setError("网络错误，暂时无法撤回这笔下注");
    }
  };

  const setQuickAmount = (matchId: string, amt: number | "ALL", match?: Match) => {
    let limit = 500;
    if (match) {
        if (match.stageType === "GROUP") limit = sysSettings.GROUP_MAX;
        else if (match.stageType === "BRACKET") limit = Math.max(sysSettings.KO_MIN, Math.floor(points * (sysSettings.KO_PERCENT / 100)));
    }
    const finalAmt = amt === "ALL" ? Math.min(points, limit) : Math.min(amt, limit);
    setBetAmount((prev) => ({ ...prev, [matchId]: finalAmt }));
  };

  const filteredMatches = useMemo(() => {
    if (filter === "ALL") return matches;
    return matches.filter(m => m.status === filter);
  }, [matches, filter]);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="ggst-dashboard-shell max-w-[92rem] mx-auto p-4 sm:p-8 relative">
        <div className="ggst-dashboard-shell__stage" aria-hidden="true" />

        {/* Rulebook Modal */}
        <AnimatePresence>
          {showRules && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-[#111111] border-4 border-red-600 p-8 max-w-lg w-full shadow-[10px_10px_0px_rgba(239,68,68,0.5)] transform -skew-x-2 relative"
              >
                <button
                  onClick={() => setShowRules(false)}
                  className="absolute top-2 right-4 text-white hover:text-red-500 text-3xl font-bold font-sans transform skew-x-2"
                >
                  &times;
                </button>
                <div className="transform skew-x-2">
                  <h2 className="text-3xl font-black text-white mb-4 tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]">
                    {"\u4e0b\u6ce8\u89c4\u5219 / \u8d54\u6c60\u8bf4\u660e"}
                  </h2>
                  <div className="space-y-4 text-neutral-300 font-medium text-sm leading-relaxed">
                    <p>
                      <strong className="text-red-400 text-lg">{"\u9875\u9762\u8bf4\u660e"}</strong><br/>
                      {"开盘中：正在开放押注的对局。"}<br/>
                      {"已结算：已经完成结算并显示比分与派彩的对局。"}
                    </p>
                    <p>
                      <strong className="text-red-400 text-lg">{"\u540c\u6c60\u8d54\u7387"}</strong><br/>
                      {"\u53cc\u65b9\u62bc\u6ce8\u4f1a\u8fdb\u5165\u5404\u81ea\u5956\u6c60\uff0c\u8d54\u7387\u548c\u56de\u62a5\u4f1a\u968f\u7740\u4eba\u7fa4\u6d41\u5411\u53d8\u5316\uff0c\u65f6\u673a\u548c\u5e02\u573a\u60c5\u7eea\u90fd\u5f88\u91cd\u8981\u3002"}
                    </p>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={() => setShowRules(false)}
                      className="ggst-button px-8 py-3 text-xl border-red-500"
                    >
                      {"\u660e\u767d\u4e86"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Error Notification */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6 relative z-10 transform -skew-x-2"
            >
              <div className="bg-red-950/80 border-2 border-red-500 text-red-200 p-4 flex items-center justify-between shadow-[4px_4px_0px_rgba(239,68,68,1)] animate-ggst-shake" role="alert">
                <span className="font-bold tracking-widest flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}>{"\u7cfb\u7edf\u8b66\u62a5\uff1a"}{error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-white transition-colors p-1" aria-label="\u5173\u95ed\u9519\u8bef">{"\u5173\u95ed"}</button>
              </div>
            </motion.div>
          )}
          {welfareMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.9 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.9 }}
              className="overflow-hidden mb-6 relative z-10 transform -skew-x-2"
            >
              <div className="bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400 p-4 flex items-center justify-between shadow-[4px_4px_0px_rgba(234,179,8,1)] animate-ggst-shake" role="alert">
                <span className="font-bold tracking-widest flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.5rem" }}>{"\u7cfb\u7edf\u64ad\u62a5\uff1a"}{welfareMsg}</span>
                <button onClick={() => setWelfareMsg(null)} className="text-yellow-500 hover:text-white transition-colors p-1" aria-label="\u5173\u95ed\u901a\u77e5">{"\u5173\u95ed"}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="ggst-dashboard-layout grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-6 relative z-10 w-full">
          {/* Main Matches Area (Left) */}
          <div className="ggst-dashboard-main min-w-0">
            {/* Balance Display & Filters */}
            <div className="ggst-command-rail mb-8">
              <div className="ggst-command-rail__group ggst-command-rail__group--left">
                <div className="ggst-command-rail__zone ggst-command-rail__zone--left">
                  {!isInitialLoad && points < 50 && (
                    <button
                      onClick={handleWelfare}
                      className="ggst-button ggst-alert-chip animate-pulse"
                    >
                      {"余额告急：领取 50 W$ 急救补助"}
                    </button>
                  )}
                  <div className="ggst-balance-chip transform -skew-x-2">
                    <span className="ggst-balance-chip__label" style={{ fontFamily: "var(--font-geist-mono)" }}>
                      当前余额
                    </span>
                    <span className="ggst-balance-chip__value" style={{ fontFamily: "var(--font-bebas)" }}>
                      {points.toLocaleString()} W$
                    </span>
                  </div>
                </div>
              </div>
              <div className="ggst-command-rail__group ggst-command-rail__group--center">
                <div className="ggst-command-rail__zone ggst-command-rail__zone--center">
                  <div className="ggst-mode-rail">
                    {(["OPEN", "SETTLED", "ALL"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`ggst-mode-tab ${
                          filter === f
                            ? "ggst-mode-tab--active"
                            : "ggst-mode-tab--idle"
                        }`}
                        style={{ fontFamily: "var(--font-bebas)" }}
                        aria-pressed={filter === f}
                      >
                        {f === "OPEN" ? "开盘中" : f === "SETTLED" ? "已结算" : "全部"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="ggst-command-rail__group ggst-command-rail__group--right">
                <div className="ggst-command-rail__zone ggst-command-rail__zone--right ggst-top-utility__actions">
                  <button
                    onClick={() => fetchData()}
                    disabled={isRefreshing}
                    className="ggst-button ggst-top-utility__button flex items-center gap-2"
                    aria-label="\u5237\u65b0\u5bf9\u5c40"
                  >
                    <motion.span
                      animate={{ rotate: isRefreshing ? 360 : 0 }}
                      transition={{ repeat: isRefreshing ? Infinity : 0, duration: 1, ease: "linear" }}
                      className="inline-block"
                    >
                      R
                    </motion.span>
                    {"\u5237\u65b0"}
                  </button>
                  <button
                    onClick={() => setShowRules(true)}
                    className="ggst-button ggst-top-utility__button"
                    aria-label="\u67e5\u770b\u89c4\u5219"
                  >
                    {"\u89c4\u5219"}
                  </button>
                </div>
              </div>
            </div>

            {/* Match List */}
            {filteredMatches.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-black/50 border-2 border-neutral-800 border-dashed backdrop-blur-sm relative z-10 transform -skew-x-2 w-full"
              >
                <p className="text-neutral-500 font-bold text-2xl tracking-widest">{"\u6682\u65e0\u8fdb\u884c\u4e2d\u7684\u5bf9\u5c40"}</p>
              </motion.div>
            ) : (
              <motion.div className="ggst-match-grid grid grid-cols-1 2xl:grid-cols-2 gap-6 relative z-10 w-full" layout>
            <AnimatePresence>
              {filteredMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  userId={userId}
                  points={points}
                  userInventory={userInventory}
                  sysSettings={sysSettings}
                  fetchUserPoints={fetchUserPoints}
                  fetchMatches={fetchMatches}
                  setError={setError}
                  setPoints={setPoints}
                  setWelfareMsg={setWelfareMsg}
                />
              ))}
            </AnimatePresence>
          </motion.div>
          )}
          </div>

          {/* Right Column: Leaderboard / Live Intel */}
          <div className="ggst-dashboard-side flex flex-col gap-6">
            {!isInitialLoad && (
              <div className="ggst-bounty-board relative overflow-hidden">
                <div className="ggst-bounty-board__corner ggst-bounty-board__corner--tr" aria-hidden="true"></div>
                <div className="ggst-bounty-board__corner ggst-bounty-board__corner--bl" aria-hidden="true"></div>
                <div className="ggst-bounty-board__mount ggst-bounty-board__mount--left" aria-hidden="true"></div>
                <div className="ggst-bounty-board__mount ggst-bounty-board__mount--right" aria-hidden="true"></div>

                <div className="ggst-bounty-board__header">
                  <div className="ggst-bounty-board__title-band" style={{ fontFamily: "var(--font-geist-mono)" }}>
                    <span className="ggst-bounty-board__eyebrow">HOT BOARD</span>
                    <span className="ggst-bounty-board__eyebrow-sub">WANTED / BOUNTY</span>
                  </div>
                  <h3 className="ggst-bounty-board__title" style={{ fontFamily: "var(--font-bebas)" }}>
                    <span className="ggst-bounty-board__title-main">
                      <span className="ggst-bounty-board__hot">热榜</span>
                      <span className="ggst-bounty-board__title-text">悬赏榜单</span>
                    </span>
                  </h3>
                </div>

                <div className="ggst-bounty-board__list">
                  {leaderboard.length === 0 ? (
                    <p className="text-neutral-500 text-lg font-mono font-bold animate-pulse">{"\u699c\u5355\u52a0\u8f7d\u4e2d..."}</p>
                  ) : (
                    leaderboard.map((user, index) => {
                      const isTop3 = index < 3;
                      const isFirst = index === 0;
                      const rankText = index === 0 ? '1ST' : index === 1 ? '2ND' : index === 2 ? '3RD' : `${index + 1}TH`;

                      return (
                        <div
                          key={user.id}
                          className={`ggst-bounty-board__item flex justify-between items-center font-mono transition-all hover:translate-x-1 ${
                            isFirst
                              ? "ggst-bounty-board__item--first"
                              : isTop3
                                ? "ggst-bounty-board__item--top"
                                : "ggst-bounty-board__item--rest"
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            {isFirst && <span className="ggst-bounty-board__seal">CHAMP</span>}
                            <span
                              className={`ggst-bounty-board__rank font-black tracking-widest ${
                                isFirst
                                  ? "ggst-bounty-board__rank--first"
                                  : isTop3
                                    ? "ggst-bounty-board__rank--top"
                                    : "ggst-bounty-board__rank--rest"
                              }`}
                              style={{ fontFamily: "var(--font-bebas)" }}
                            >
                              {rankText}
                            </span>

                            <span
                              className={`ggst-bounty-board__name truncate font-bold ${
                                isFirst
                                  ? "ggst-bounty-board__name--first"
                                  : isTop3
                                    ? "ggst-bounty-board__name--top"
                                    : "ggst-bounty-board__name--rest"
                              }`}
                              style={user.nameColor && user.nameColor !== "#ffffff" ? { color: user.nameColor, textShadow: "0 0 5px currentColor" } : {}}
                            >
                              {user.displayName}
                            </span>
                          </div>

                          <div className="ggst-bounty-board__points-wrap">
                            {isFirst && (
                              <span className="ggst-bounty-board__points-label" style={{ fontFamily: "var(--font-geist-mono)" }}>
                                BOUNTY
                              </span>
                            )}
                            <span
                              className={`ggst-bounty-board__points font-black ml-2 shrink-0 tracking-widest ${
                                isFirst
                                  ? "ggst-bounty-board__points--first"
                                  : isTop3
                                    ? "ggst-bounty-board__points--top"
                                    : "ggst-bounty-board__points--rest"
                              }`}
                              style={{ fontFamily: "var(--font-bebas)" }}
                            >
                              {user.points.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <style jsx global>{`
          .ggst-dashboard-shell {
            --ggst-bg-0: #040506;
            --ggst-bg-1: #080a0e;
            --ggst-panel-0: #0b0d12;
            --ggst-panel-1: #11141a;
            --ggst-text-main: #f0ece3;
            --ggst-text-muted: #9fa3aa;
            --ggst-text-dim: #6f747c;
            --ggst-accent-red: #d5101e;
            --ggst-accent-red-hot: #ff2a2a;
            --ggst-accent-gold: #c7a128;
            --ggst-accent-gold-dim: #8b7321;
            --ggst-accent-blue-trim: #4e68b8;
          }

          .ggst-app-shell {
            background-color: var(--ggst-bg-0);
            background-image:
              linear-gradient(to right, rgba(255, 255, 255, 0.008) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.008) 1px, transparent 1px) !important;
          }

          .ggst-dashboard-shell__stage {
            background:
              radial-gradient(circle at 32% 32%, rgba(213, 16, 30, 0.028), transparent 15%),
              radial-gradient(circle at 68% 28%, rgba(213, 16, 30, 0.022), transparent 14%),
              radial-gradient(circle at 50% 38%, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.18) 46%, rgba(0, 0, 0, 0.42) 100%) !important;
          }

          .ggst-command-rail {
            position: relative;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto auto;
            align-items: center;
            gap: 0.5rem !important;
            padding: 0.44rem 0.56rem !important;
            border: 2px solid #22262d !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.008), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #0b0d12, #040506) !important;
            box-shadow:
              10px 10px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.015) !important;
          }

          .ggst-command-rail::before {
            content: "";
            position: absolute;
            left: 0;
            top: 0;
            width: min(9rem, 22%);
            height: 3px;
            background: linear-gradient(90deg, #d5101e, #ff2a2a 52%, transparent);
          }

          .ggst-command-rail__group {
            min-height: 2.8rem;
            display: flex;
            align-items: center;
            gap: 0.45rem;
          }

          .ggst-command-rail__group--center {
            justify-self: center;
          }

          .ggst-command-rail__group--right {
            justify-self: end;
          }

          .ggst-command-rail__group--center::before,
          .ggst-command-rail__group--right::before {
            content: "";
            width: 1px;
            align-self: stretch;
            margin-right: 0.1rem;
            background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.08), transparent);
          }

          .ggst-alert-chip {
            min-height: 2.45rem !important;
            padding-inline: 0.76rem !important;
            border: 2px solid rgba(213, 16, 30, 0.94) !important;
            background:
              linear-gradient(180deg, rgba(255, 42, 42, 0.14), rgba(0, 0, 0, 0)),
              #14080b !important;
            color: #d7b552 !important;
            box-shadow: 4px 4px 0 #000000 !important;
          }

          .ggst-balance-chip {
            min-height: 2.55rem !important;
            padding: 0.28rem 0.68rem !important;
            border: 2px solid rgba(199, 161, 40, 0.92) !important;
            background:
              linear-gradient(180deg, rgba(199, 161, 40, 0.08), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #100d06, #050505) !important;
            box-shadow: 5px 5px 0 #000000 !important;
          }

          .ggst-balance-chip__label {
            color: #9f8331 !important;
          }

          .ggst-balance-chip__value {
            color: #d9b24b !important;
            text-shadow: 1px 1px 0 #000000;
          }

          .ggst-mode-rail {
            min-height: 2.82rem;
            padding: 0.2rem !important;
            border: 2px solid #22262d !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.006), rgba(255, 255, 255, 0)),
              #040506 !important;
            box-shadow: 5px 5px 0 #000000 !important;
          }

          .ggst-mode-tab {
            min-height: 2.35rem !important;
            padding-inline: 1rem !important;
            color: #e0d8cc !important;
          }

          .ggst-mode-tab--active {
            border: 1px solid rgba(213, 16, 30, 0.98) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #ff2a2a, #d5101e 54%, #900d15) !important;
            box-shadow:
              3px 3px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
          }

          .ggst-top-utility__actions {
            min-height: 2.82rem;
            padding: 0.18rem !important;
            gap: 0.32rem !important;
            border: 2px solid #22262d !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.006), rgba(255, 255, 255, 0)),
              #060709 !important;
            box-shadow: 5px 5px 0 #000000 !important;
          }

          .ggst-top-utility__button {
            min-height: 2.3rem !important;
            padding-inline: 0.78rem !important;
            border: 1px solid #2f353e !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
              #0e1116 !important;
            color: var(--ggst-text-main) !important;
            box-shadow: 3px 3px 0 #000000 !important;
          }

          .ggst-sidebar {
            background:
              linear-gradient(180deg, rgba(12, 14, 18, 0.992), rgba(6, 7, 9, 0.996)) !important;
          }

          .ggst-sidebar__link {
            color: #c1b8ac !important;
            min-height: 2.9rem !important;
          }

          .ggst-sidebar__icon {
            border-color: #2a2f38 !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.016), rgba(255, 255, 255, 0)),
              #0c1016 !important;
            color: #f0ece3 !important;
          }

          .ggst-sidebar__link--active {
            border-color: rgba(213, 16, 30, 0.9) !important;
            background:
              linear-gradient(180deg, rgba(255, 42, 42, 0.2), rgba(0, 0, 0, 0) 74%),
              linear-gradient(90deg, rgba(213, 16, 30, 0.18), rgba(0, 0, 0, 0)),
              #170c10 !important;
            box-shadow:
              4px 4px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.03) !important;
          }

          .ggst-sidebar__player-card {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
              #10141a;
            box-shadow: 5px 5px 0 #000000;
          }

          .ggst-clash-card {
            border: 2px solid #262b33 !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.014), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #101318, #0a0d12 42%, #080a0e 100%) !important;
            box-shadow:
              10px 10px 0 #000000,
              0 20px 36px rgba(0, 0, 0, 0.28),
              inset 0 0 0 1px rgba(255, 255, 255, 0.022) !important;
          }

          .ggst-clash-card > .bg-noise {
            opacity: 0.012 !important;
          }

          .ggst-clash-card::before {
            height: 4px !important;
            background: linear-gradient(90deg, #d5101e, #ff2a2a 28%, #c7a128 62%, rgba(78, 104, 184, 0.72) 100%) !important;
          }

          .ggst-card-visual {
            opacity: 0.05 !important;
            filter: grayscale(0.12) contrast(1.05) brightness(0.78) !important;
          }

          .ggst-card-visuals__vignette {
            background:
              linear-gradient(180deg, rgba(0, 0, 0, 0.015), rgba(0, 0, 0, 0.1) 56%, rgba(0, 0, 0, 0.22)),
              linear-gradient(90deg, rgba(0, 0, 0, 0.12), transparent 12%, transparent 88%, rgba(0, 0, 0, 0.16)) !important;
          }

          .ggst-hero-plate {
            margin: 0.34rem 0.34rem 0 !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #12151b, #0c0f14 84%) !important;
          }

          .ggst-hero-plate::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              linear-gradient(90deg, rgba(213, 16, 30, 0.045), transparent 17%, transparent 83%, rgba(78, 104, 184, 0.03));
          }

          .ggst-control-module {
            margin: 0 0.34rem 0.34rem !important;
            border-top: 5px solid #08090d !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.008), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #161a21, #101318 80%) !important;
          }

          .ggst-meter-summary__total,
          .ggst-matchup-vs__versus,
          .ggst-matchup-vs__score,
          .ggst-fighter-card__name-text,
          .ggst-pool-readout__value {
            color: #f0ece3 !important;
            opacity: 1 !important;
          }

          .ggst-meter-summary__total {
            font-size: clamp(2.75rem, 4.4vw, 3.2rem) !important;
            text-shadow: 3px 3px 0 #000000 !important;
          }

          .ggst-pool-readout__value,
          .ggst-bet-panel__hint,
          .ggst-fighter-card__character {
            color: #c7a128 !important;
          }

          .ggst-meter-summary__chip,
          .ggst-matchup-vs__chip,
          .ggst-fighter-card__side-tag,
          .ggst-intel-feed__label {
            font-size: 0.66rem !important;
            letter-spacing: 0.18em !important;
            text-transform: uppercase;
          }

          .ggst-clash-meter {
            background: #040506 !important;
          }

          .ggst-fighter-card {
            border: 2px solid #242931 !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #171b22, #0d1117 100%) !important;
            box-shadow:
              6px 6px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.02) !important;
          }

          .ggst-fighter-card::after {
            content: "";
            position: absolute;
            top: 0;
            bottom: 0;
            width: 4px;
            pointer-events: none;
          }

          .ggst-fighter-card--a::after {
            left: 0;
            background: linear-gradient(180deg, rgba(213, 16, 30, 0.95), rgba(213, 16, 30, 0.24));
          }

          .ggst-fighter-card--b::after {
            right: 0;
            background: linear-gradient(180deg, rgba(78, 104, 184, 0.92), rgba(78, 104, 184, 0.22));
          }

          .ggst-fighter-card__portrait {
            min-height: 122px !important;
          }

          .ggst-fighter-card__avatar {
            width: 116px !important;
            height: 116px !important;
            border: 2px solid rgba(255, 255, 255, 0.14) !important;
            background: #07080b !important;
            box-shadow:
              5px 5px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.022) !important;
          }

          .ggst-fighter-card__char-tag {
            border: 2px solid #050505 !important;
            background: linear-gradient(180deg, #f2d974, #c7a128) !important;
            color: #050505 !important;
          }

          .ggst-fighter-card__name {
            min-height: 82px !important;
          }

          .ggst-fighter-card__name-text {
            font-size: clamp(2.18rem, 4.8vw, 3.18rem) !important;
            line-height: 0.78 !important;
            text-shadow:
              3px 3px 0 #000000,
              0 0 8px rgba(255, 255, 255, 0.02) !important;
          }

          .ggst-matchup-vs {
            min-height: 224px !important;
          }

          .ggst-matchup-vs::before {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.014), rgba(255, 255, 255, 0)),
              repeating-linear-gradient(135deg, rgba(199, 161, 40, 0.06) 0 8px, rgba(0, 0, 0, 0) 8px 16px),
              #12151a !important;
          }

          .ggst-matchup-vs__versus {
            font-size: clamp(3.85rem, 6.4vw, 4.75rem) !important;
            color: #f0ece3 !important;
            text-shadow:
              3px 3px 0 #000000,
              6px 6px 0 rgba(213, 16, 30, 0.88),
              9px 9px 0 rgba(199, 161, 40, 0.32) !important;
          }

          .ggst-bet-panel {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #171b22, #101318) !important;
          }

          .ggst-bet-panel__top {
            align-items: flex-end !important;
          }

          .ggst-bet-panel__label {
            font-size: 1.46rem !important;
            line-height: 0.92;
            text-shadow: 2px 2px 0 #000000;
          }

          .ggst-bet-panel__hint {
            font-size: 0.74rem !important;
            letter-spacing: 0.14em;
          }

          .ggst-bet-panel__closed {
            display: grid;
            grid-template-columns: auto 1fr;
            align-items: center;
            gap: 0.68rem;
            min-height: 3rem !important;
            padding: 0.66rem 0.78rem !important;
            border: 1px solid rgba(95, 36, 41, 0.82) !important;
            background:
              linear-gradient(180deg, rgba(213, 16, 30, 0.08), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #160d10, #0d0a0c) !important;
            box-shadow: 4px 4px 0 #000000 !important;
          }

          .ggst-bet-panel__closed::before {
            content: "LOCK";
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 3.1rem;
            padding: 0.16rem 0.38rem;
            border: 1px solid rgba(199, 161, 40, 0.76);
            background: rgba(20, 16, 7, 0.96);
            color: #e8c969;
            font-family: var(--font-bebas);
            font-size: 0.86rem;
            letter-spacing: 0.16em;
          }

          .ggst-bet-panel__closed-title {
            margin: 0 !important;
            font-size: 1rem !important;
            letter-spacing: 0.1em;
            color: #f0ece3 !important;
          }

          .ggst-bet-panel__closed-text {
            margin: 0.06rem 0 0 !important;
            font-size: 0.72rem !important;
            line-height: 1.35;
            color: #bab2a6 !important;
          }

          .ggst-quick-chip {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
              #101419 !important;
            color: #f0ece3 !important;
          }

          .ggst-quick-chip--all {
            background:
              linear-gradient(180deg, rgba(255, 42, 42, 0.2), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #281216, #160c0f) !important;
          }

          .ggst-bet-input,
          .ggst-comment-input {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.008), rgba(255, 255, 255, 0)),
              #0a0d12 !important;
            color: #f0ece3 !important;
          }

          .ggst-bet-input::placeholder,
          .ggst-comment-input::placeholder {
            color: #8d8a82 !important;
          }

          .ggst-choice-button {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #232730, #151920) !important;
          }

          .ggst-choice-button--selected.ggst-choice-button--a {
            background:
              linear-gradient(180deg, rgba(255, 42, 42, 0.18), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #2a1216, #180d10) !important;
          }

          .ggst-intel-feed {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #161a21, #101318) !important;
          }

          .ggst-intel-feed__label {
            background:
              linear-gradient(180deg, rgba(199, 161, 40, 0.2), rgba(0, 0, 0, 0)),
              #100e09 !important;
            border-color: rgba(199, 161, 40, 0.68) !important;
          }

          .ggst-intel-feed__empty {
            display: flex;
            align-items: center;
            gap: 0.52rem;
            min-height: 1.9rem !important;
            padding: 0.34rem 0.58rem !important;
            border: 1px solid rgba(59, 64, 74, 0.82);
            background:
              linear-gradient(180deg, rgba(199, 161, 40, 0.04), rgba(0, 0, 0, 0)),
              #101318 !important;
            color: #d7d0c3 !important;
          }

          .ggst-intel-feed__empty-prefix {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 2.5rem;
            padding: 0.1rem 0.34rem;
            border: 1px solid rgba(199, 161, 40, 0.7);
            background: rgba(18, 14, 7, 0.96);
            color: #e6c45f;
            font-family: var(--font-bebas);
            font-size: 0.74rem;
            letter-spacing: 0.16em;
          }

          .ggst-intel-feed__empty-text {
            font-family: var(--font-geist-mono);
            font-size: 0.74rem;
            letter-spacing: 0.06em;
          }

          .ggst-bounty-board {
            border: 2px solid rgba(213, 16, 30, 0.9) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #08090c, #050608) !important;
            box-shadow:
              8px 8px 0 #000000,
              0 18px 28px rgba(0, 0, 0, 0.24) !important;
          }

          .ggst-bounty-board__hot {
            color: #ff2a2a !important;
          }

          .ggst-bounty-board__item--first {
            border-left-width: 7px !important;
            border-left-color: #c7a128 !important;
            border-color: rgba(139, 115, 33, 0.76) !important;
            background:
              linear-gradient(180deg, rgba(199, 161, 40, 0.08), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #17140d, #0b0a07) !important;
          }

          .ggst-bounty-board__item--top {
            border-left-color: rgba(213, 16, 30, 0.8) !important;
            background:
              linear-gradient(180deg, rgba(213, 16, 30, 0.05), rgba(0, 0, 0, 0)),
              #110d10 !important;
          }

          /* Dashboard arcade syntax correction */
          .ggst-command-rail {
            border: 2px solid #242932 !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.014), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #0f1217, #090b0f) !important;
            box-shadow:
              8px 8px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.018) !important;
          }

          .ggst-command-rail::before {
            height: 4px !important;
            background: linear-gradient(90deg, #d5101e 0%, #ff2a2a 48%, rgba(255, 42, 42, 0.18) 100%) !important;
          }

          .ggst-command-rail__group {
            min-height: 3rem !important;
          }

          .ggst-command-rail__group--center::before,
          .ggst-command-rail__group--right::before {
            background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.12) 20%, rgba(255, 255, 255, 0.12) 80%, transparent) !important;
          }

          .ggst-balance-chip {
            position: relative;
            overflow: hidden;
            border: 2px solid rgba(139, 115, 33, 0.96) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.018), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #161208, #0a0906) !important;
            box-shadow:
              6px 6px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.022) !important;
          }

          .ggst-balance-chip::before {
            content: "";
            position: absolute;
            inset: 0 auto 0 0;
            width: 6px;
            background: linear-gradient(180deg, #f2cf5b, #8b7321);
          }

          .ggst-mode-rail {
            display: inline-flex;
            align-items: center;
            gap: 0.34rem;
            padding: 0.34rem;
            border: 2px solid #262b33;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
              #090b0f;
            box-shadow:
              6px 6px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.02);
            transform: skewX(-8deg);
          }

          .ggst-mode-tab {
            min-height: 2.52rem !important;
            padding: 0.32rem 1.1rem !important;
            border: 2px solid transparent !important;
            color: #f0ece3 !important;
            font-size: 1.22rem !important;
            letter-spacing: 0.08em;
            transform: skewX(8deg);
            transition: background 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease;
          }

          .ggst-mode-tab--idle {
            border-color: #353b45 !important;
            background: linear-gradient(180deg, #151920, #0b0e13) !important;
            color: #cbc4b6 !important;
          }

          .ggst-mode-tab--idle:hover {
            border-color: #555d69 !important;
            color: #f0ece3 !important;
            background: linear-gradient(180deg, #1b2027, #10141a) !important;
          }

          .ggst-mode-tab--active {
            border-color: #ff2a2a !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #ff2a2a, #b40f19) !important;
            color: #fff8f3 !important;
            box-shadow:
              inset 0 0 0 1px rgba(255, 255, 255, 0.08),
              0 0 0 1px rgba(255, 42, 42, 0.18) !important;
          }

          .ggst-top-utility__actions {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
              #0a0c11 !important;
            border: 1px solid #282c34 !important;
            box-shadow:
              5px 5px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.02) !important;
          }

          .ggst-top-utility__button {
            border: 1px solid #3b424d !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.018), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #191d24, #0f1318) !important;
            color: #f0ece3 !important;
            box-shadow: 3px 3px 0 #000000 !important;
          }

          .ggst-top-utility__button:hover {
            border-color: rgba(213, 16, 30, 0.72) !important;
            color: #fff7f1 !important;
          }

          .ggst-clash-card {
            border: 2px solid #23272e !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #0e1016, #080a0e 52%, #040506 100%) !important;
            box-shadow:
              10px 10px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.018) !important;
          }

          .ggst-card-visual {
            opacity: 0.05 !important;
            filter: grayscale(0.12) contrast(1.08) brightness(0.76) !important;
          }

          .ggst-hero-plate {
            margin: 0.32rem 0.32rem 0 !important;
            border: 1px solid rgba(41, 46, 56, 0.96);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.014), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #11141a, #090b10 84%) !important;
            box-shadow:
              inset 0 0 0 1px rgba(255, 255, 255, 0.012),
              0 0 0 1px rgba(0, 0, 0, 0.4) !important;
          }

          .ggst-hero-plate::after {
            content: "";
            position: absolute;
            inset: auto 0.9rem -1px;
            height: 3px;
            background: linear-gradient(90deg, rgba(213, 16, 30, 0.96), rgba(255, 42, 42, 0.48) 44%, rgba(199, 161, 40, 0.32));
          }

          .ggst-control-module {
            margin: 0 0.32rem 0.32rem !important;
            border: 1px solid rgba(39, 44, 53, 0.94);
            border-top: 6px solid #07080c !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #11141a, #090b10 80%) !important;
            box-shadow:
              inset 0 0 0 1px rgba(255, 255, 255, 0.012),
              0 0 0 1px rgba(0, 0, 0, 0.42) !important;
          }

          .ggst-fighter-card {
            border: 2px solid #242932 !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #12161d, #090b10 100%) !important;
          }

          .ggst-fighter-card__side-tag {
            background: #07080b !important;
            color: var(--ggst-text-main) !important;
            border-color: #20252d !important;
          }

          .ggst-fighter-card__portrait {
            min-height: 132px !important;
          }

          .ggst-fighter-card__avatar {
            width: 126px !important;
            height: 126px !important;
            border: 2px solid #2d323c !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.018), rgba(255, 255, 255, 0)),
              #050607 !important;
          }

          .ggst-player-avatar {
            border-width: 2px !important;
            border-radius: 14px !important;
            background-color: #090b0f !important;
          }

          .ggst-player-avatar__char-badge {
            border-color: #050505 !important;
            background: linear-gradient(180deg, #d9b450, #c7a128) !important;
            color: #050505 !important;
          }

          .ggst-player-avatar__fallback-frame {
            border-color: rgba(255, 255, 255, 0.16) !important;
          }

          .ggst-player-avatar__fallback-mark {
            font-size: 2.45rem !important;
            letter-spacing: 0.02em;
          }

          .ggst-fighter-card__name-text {
            color: var(--ggst-text-main) !important;
            font-size: clamp(2.32rem, 5vw, 3.3rem) !important;
            text-shadow:
              3px 3px 0 #000000,
              0 0 8px rgba(255, 255, 255, 0.012) !important;
          }

          .ggst-fighter-card__character {
            display: inline-flex;
            align-items: center;
            align-self: flex-start;
            margin-top: 0.12rem;
            padding: 0.08rem 0.42rem;
            border: 1px solid rgba(199, 161, 40, 0.5);
            background: rgba(13, 10, 7, 0.98);
            color: #d7b552 !important;
            font-size: 0.72rem !important;
            letter-spacing: 0.16em;
          }

          .ggst-matchup-vs {
            min-height: 232px !important;
          }

          .ggst-matchup-vs::before {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
              repeating-linear-gradient(135deg, rgba(199, 161, 40, 0.06) 0 8px, rgba(0, 0, 0, 0) 8px 16px),
              #0d1015 !important;
          }

          .ggst-matchup-vs__chip {
            background: linear-gradient(180deg, #d9b450, #c7a128) !important;
            color: #050505 !important;
            border-color: #050505 !important;
          }

          .ggst-matchup-vs__versus {
            font-size: clamp(4.1rem, 6.7vw, 5.1rem) !important;
            color: #fff4ee !important;
            text-shadow:
              3px 3px 0 #000000,
              7px 7px 0 rgba(213, 16, 30, 0.98),
              10px 10px 0 rgba(255, 42, 42, 0.3) !important;
          }

          .ggst-bet-panel {
            border: 1px solid rgba(42, 47, 56, 0.94) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #11141a, #090b10) !important;
          }

          .ggst-bet-panel__label {
            color: var(--ggst-text-main) !important;
          }

          .ggst-quick-chip {
            border: 1px solid #303640 !important;
            background: #0d1015 !important;
            color: var(--ggst-text-main) !important;
            box-shadow: 3px 3px 0 #000000 !important;
          }

          .ggst-quick-chip:hover {
            border-color: rgba(255, 255, 255, 0.18) !important;
            background: #13171d !important;
          }

          .ggst-quick-chip--all {
            border-color: rgba(213, 16, 30, 0.96) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #ff2a2a, #d5101e 54%, #8d0c14) !important;
            color: #fff1ee !important;
          }

          .ggst-choice-button {
            border: 1px solid #303640 !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #151922, #0d1015) !important;
            box-shadow: 5px 5px 0 #000000 !important;
          }

          .ggst-choice-button--selected.ggst-choice-button--a {
            border-color: rgba(213, 16, 30, 0.96) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #ff2a2a, #d5101e 56%, #870b13) !important;
          }

          .ggst-choice-button--selected.ggst-choice-button--b {
            border-color: rgba(78, 104, 184, 0.82) !important;
            background:
              linear-gradient(180deg, rgba(78, 104, 184, 0.12), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #141821, #090c10) !important;
          }

          .ggst-choice-button__prefix {
            color: #c7a128 !important;
          }

          .ggst-intel-feed {
            border: 1px solid rgba(39, 44, 53, 0.94) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.008), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #101318, #07090d) !important;
          }

          .ggst-intel-feed__title {
            margin-bottom: 0.56rem !important;
          }

          .ggst-intel-feed__label {
            padding: 0.18rem 0.52rem !important;
            border-width: 1px !important;
            background:
              linear-gradient(180deg, rgba(199, 161, 40, 0.14), rgba(0, 0, 0, 0)),
              #0f0b06 !important;
            color: var(--ggst-text-main) !important;
          }

          .ggst-intel-feed__empty {
            min-height: 1.74rem !important;
            padding-inline: 0.7rem !important;
            color: #cfc8ba !important;
            background:
              linear-gradient(180deg, rgba(199, 161, 40, 0.035), rgba(0, 0, 0, 0)),
              #090c10 !important;
          }

          .ggst-bounty-board {
            padding: 0.96rem 0.92rem 1rem !important;
            border: 2px solid rgba(112, 18, 26, 0.94) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.008), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #08090d, #040506) !important;
            box-shadow:
              10px 10px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.014),
              0 0 12px rgba(213, 16, 30, 0.05) !important;
            transform: skewX(-3deg);
            clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
          }

          .ggst-bounty-board::before {
            content: "";
            position: absolute;
            inset: 0 auto 0 0;
            width: 6px;
            background: linear-gradient(180deg, #d5101e, #7f0c15);
          }

          .ggst-bounty-board__title,
          .ggst-bounty-board__list {
            transform: skewX(3deg);
          }

          .ggst-bounty-board__title {
            gap: 0.14rem;
            margin-bottom: 0.82rem !important;
          }

          .ggst-bounty-board__eyebrow {
            display: inline-flex;
            align-self: flex-start;
            padding: 0.1rem 0.44rem 0.12rem;
            background: linear-gradient(180deg, #ff2a2a, #d5101e 58%, #8f0f17);
            border: 1px solid rgba(255, 255, 255, 0.06);
            color: #f5ece5 !important;
            letter-spacing: 0.22em !important;
          }

          .ggst-bounty-board__title-main {
            display: flex;
            align-items: baseline;
            gap: 0.38rem;
          }

          .ggst-bounty-board__hot {
            color: #ff2a2a !important;
            font-size: 1.06rem !important;
          }

          .ggst-bounty-board__title-text {
            font-size: 1.86rem !important;
            color: #f0ece3 !important;
          }

          .ggst-bounty-board__rank {
            letter-spacing: 0.12em !important;
          }

          .ggst-bounty-board__points {
            font-size: 1rem !important;
          }

          .ggst-bounty-board__list {
            display: flex;
            flex-direction: column;
            gap: 0.48rem;
          }

          .ggst-bounty-board__item {
            position: relative;
            min-height: 3rem !important;
            padding: 0.66rem 0.74rem !important;
            border: 1px solid rgba(56, 27, 31, 0.88) !important;
            box-shadow: 4px 4px 0 #000000 !important;
          }

          .ggst-bounty-board__seal {
            display: inline-flex;
            align-items: center;
            padding: 0.12rem 0.38rem;
            border: 1px solid rgba(199, 161, 40, 0.72);
            background: rgba(15, 12, 7, 0.98);
            color: #d8b450;
            font-family: var(--font-bebas);
            font-size: 0.72rem;
            letter-spacing: 0.14em;
            clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 50%, calc(100% - 4px) 100%, 0 100%);
          }

          .ggst-bounty-board__item--first {
            border-color: rgba(199, 161, 40, 0.74) !important;
            border-left-width: 8px !important;
            border-left-color: #c7a128 !important;
            background:
              linear-gradient(180deg, rgba(199, 161, 40, 0.08), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #141008, #060505) !important;
            box-shadow:
              5px 5px 0 #000000,
              inset 0 0 0 1px rgba(199, 161, 40, 0.12),
              0 0 10px rgba(199, 161, 40, 0.06) !important;
          }

          .ggst-bounty-board__item--top {
            border-left-width: 5px !important;
            border-left-color: rgba(213, 16, 30, 0.84) !important;
            background:
              linear-gradient(180deg, rgba(213, 16, 30, 0.08), rgba(0, 0, 0, 0)),
              #0f0a0d !important;
          }

          .ggst-bounty-board__item--rest {
            border-left-width: 3px !important;
            border-left-color: rgba(80, 84, 92, 0.95) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
              #0b0d12 !important;
          }

          .ggst-bounty-board__rank--first,
          .ggst-bounty-board__name--first,
          .ggst-bounty-board__points--first {
            color: #d8b450 !important;
            text-shadow: 1px 1px 0 #000000 !important;
          }

          .ggst-bounty-board__rank--top,
          .ggst-bounty-board__points--top {
            color: #e34d53 !important;
          }

          /* MatchCard machine panel correction */
          .ggst-hero-plate {
            margin: 0.3rem 0.3rem 0 !important;
            border: 1px solid rgba(57, 63, 74, 0.96) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.018), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #171b22, #0d1015 82%) !important;
            box-shadow:
              inset 0 0 0 1px rgba(255, 255, 255, 0.016),
              0 0 0 1px rgba(0, 0, 0, 0.46) !important;
          }

          .ggst-card-head {
            margin-bottom: 0.6rem !important;
          }

          .ggst-meter-summary {
            gap: 0.55rem !important;
          }

          .ggst-meter-summary__chip {
            border-width: 1px !important;
            padding: 0.12rem 0.4rem !important;
            background:
              linear-gradient(180deg, #d9b450, #c7a128) !important;
            color: #050505 !important;
            box-shadow: 2px 2px 0 #000000 !important;
          }

          .ggst-meter-summary__total {
            font-size: clamp(3.05rem, 4.8vw, 3.7rem) !important;
            letter-spacing: 0.02em;
            color: var(--ggst-text-main) !important;
            text-shadow: 2px 2px 0 #000000 !important;
          }

          .ggst-meter-summary__split {
            font-size: 0.7rem !important;
            letter-spacing: 0.14em;
            color: #c7b389 !important;
          }

          .ggst-pool-readout__label {
            font-size: 0.58rem !important;
            letter-spacing: 0.18em !important;
            color: #e4ddd1 !important;
          }

          .ggst-clash-meter {
            margin-top: 0.45rem !important;
          }

          .ggst-duel-zone {
            min-height: 260px !important;
            gap: 0.78rem !important;
            align-items: stretch !important;
          }

          .ggst-fighter-card {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            padding: 0.72rem 0.78rem 0.68rem !important;
            border: 2px solid #303641 !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #1b2028, #0f1318 100%) !important;
            clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px));
            box-shadow:
              6px 6px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.018) !important;
          }

          .ggst-fighter-card__side-tag {
            align-self: flex-start;
            padding: 0.14rem 0.4rem !important;
            border: 1px solid #20242b !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.014), rgba(255, 255, 255, 0)),
              #090b0f !important;
            color: #f0ece3 !important;
            box-shadow: 2px 2px 0 #000000 !important;
          }

          .ggst-fighter-card__portrait {
            min-height: 148px !important;
            margin-top: 0.42rem;
          }

          .ggst-fighter-card__avatar {
            width: 136px !important;
            height: 136px !important;
            border: 2px solid rgba(255, 255, 255, 0.16) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.022), rgba(255, 255, 255, 0)),
              #06080b !important;
            box-shadow:
              6px 6px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.02) !important;
          }

          .ggst-fighter-card__identity {
            display: flex;
            flex-direction: column;
            gap: 0.18rem;
            margin-top: 0.34rem;
            min-width: 0;
          }

          .ggst-fighter-card__name {
            min-height: auto !important;
            margin: 0 !important;
            width: 100%;
            min-width: 0;
            overflow: hidden;
          }

          .ggst-fighter-card__name-text {
            display: block;
            width: 100%;
            max-width: 100%;
            min-width: 0;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            text-wrap: nowrap !important;
            font-size: var(--ggst-fighter-name-size, clamp(2.52rem, 5.3vw, 3.58rem)) !important;
            line-height: 0.74 !important;
            letter-spacing: var(--ggst-fighter-name-track, 0.04em) !important;
            color: #f4eee2 !important;
            text-shadow:
              3px 3px 0 #000000,
              6px 6px 0 rgba(0, 0, 0, 0.18) !important;
          }

          .ggst-fighter-card__character {
            display: inline-flex !important;
            align-items: center;
            align-self: flex-start;
            padding: 0.1rem 0.46rem !important;
            margin-top: 0 !important;
            border: 1px solid rgba(199, 161, 40, 0.42) !important;
            background:
              linear-gradient(180deg, rgba(199, 161, 40, 0.06), rgba(0, 0, 0, 0)),
              #100d08 !important;
            color: #e4c35a !important;
            font-size: 0.7rem !important;
            letter-spacing: 0.16em;
          }

          .ggst-matchup-vs {
            position: relative;
            min-height: 252px !important;
            justify-content: center !important;
            gap: 0.28rem !important;
          }

          .ggst-matchup-vs::before {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0)),
              repeating-linear-gradient(135deg, rgba(199, 161, 40, 0.09) 0 8px, rgba(0, 0, 0, 0) 8px 16px),
              #10141a !important;
          }

          .ggst-matchup-vs::after {
            content: "";
            position: absolute;
            inset: 28% 18% 26%;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, rgba(213, 16, 30, 0.98), rgba(145, 11, 19, 0.96));
            box-shadow:
              6px 6px 0 #000000,
              0 0 16px rgba(213, 16, 30, 0.12);
            clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
            pointer-events: none;
          }

          .ggst-matchup-vs__chip,
          .ggst-matchup-vs__score,
          .ggst-matchup-vs__versus {
            position: relative;
            z-index: 1;
          }

          .ggst-matchup-vs__chip {
            margin-bottom: 0.14rem !important;
          }

          .ggst-matchup-vs__versus {
            font-size: clamp(4.45rem, 7vw, 5.5rem) !important;
            color: #fff7f1 !important;
            text-shadow:
              3px 3px 0 #000000,
              7px 7px 0 rgba(213, 16, 30, 0.96),
              10px 10px 0 rgba(199, 161, 40, 0.26) !important;
          }

          .ggst-control-module {
            margin: 0 0.3rem 0.3rem !important;
            padding: 0.34rem 0 0.16rem !important;
            border-top: 7px solid #050607 !important;
            border-left: 1px solid rgba(50, 56, 67, 0.94);
            border-right: 1px solid rgba(50, 56, 67, 0.94);
            border-bottom: 1px solid rgba(50, 56, 67, 0.94);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.014), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #171b22, #0d1015 100%) !important;
          }

          .ggst-control-module::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0.9rem;
            right: 0.9rem;
            height: 2px;
            background: linear-gradient(90deg, rgba(213, 16, 30, 0.64), rgba(213, 16, 30, 0.08) 44%, rgba(199, 161, 40, 0.18));
            pointer-events: none;
          }

          .ggst-bet-panel {
            margin-top: 0.08rem !important;
            padding: 0.74rem 0.78rem 0.8rem !important;
            border: 1px solid rgba(57, 63, 73, 0.96) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.014), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #171c23, #0f1318) !important;
            box-shadow:
              inset 0 0 0 1px rgba(255, 255, 255, 0.014),
              0 0 0 1px rgba(0, 0, 0, 0.4) !important;
          }

          .ggst-bet-panel__heading {
            gap: 0.12rem !important;
          }

          .ggst-bet-panel__label {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
          }

          .ggst-bet-panel__label::before {
            content: "";
            width: 0.54rem;
            height: 0.54rem;
            background: linear-gradient(180deg, #ff2a2a, #a50f17);
            clip-path: polygon(0 0, 100% 50%, 0 100%);
          }

          .ggst-bet-panel__tools {
            gap: 0.34rem !important;
          }

          .ggst-quick-chip {
            min-height: 2.25rem !important;
            padding-inline: 0.7rem !important;
            border: 1px solid #484f5a !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.016), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #171b22, #0f1318) !important;
            box-shadow:
              3px 3px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.02) !important;
            color: #f0ece3 !important;
          }

          .ggst-quick-chip--all {
            border-color: rgba(213, 16, 30, 0.8) !important;
            background:
              linear-gradient(180deg, rgba(255, 42, 42, 0.22), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #3a1016, #18090d) !important;
            color: #fff5ef !important;
          }

          .ggst-bet-fields {
            gap: 0.42rem !important;
          }

          .ggst-bet-input,
          .ggst-comment-input {
            min-height: 2.32rem !important;
            border: 1px solid #3f4651 !important;
            border-bottom: 3px solid rgba(199, 161, 40, 0.58) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
              #090c10 !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02) !important;
          }

          .ggst-bet-actions {
            gap: 0.42rem !important;
            margin-top: 0.54rem !important;
          }

          .ggst-choice-button {
            min-height: 4.35rem !important;
            padding: 0.54rem 0.62rem 0.58rem !important;
            border: 1px solid #434a55 !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.018), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #252b34, #151a21) !important;
            box-shadow:
              5px 5px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.018) !important;
            clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px));
          }

          .ggst-choice-button__prefix {
            font-size: 0.66rem !important;
            letter-spacing: 0.18em;
            color: #bcae8d !important;
          }

          .ggst-choice-button__name {
            font-size: 1.9rem !important;
            line-height: 0.92;
            text-shadow: 2px 2px 0 #000000;
          }

          .ggst-intel-feed {
            margin-top: 0.46rem !important;
            padding: 0.44rem 0.58rem 0.48rem !important;
            border: 1px solid rgba(51, 57, 67, 0.96) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #13171d, #090c10) !important;
          }

          .ggst-intel-feed__title {
            margin-bottom: 0.4rem !important;
          }

          .ggst-intel-feed__label {
            padding: 0.16rem 0.48rem !important;
            border-width: 1px !important;
            box-shadow: 2px 2px 0 #000000 !important;
          }

          .ggst-intel-feed__list {
            gap: 0.34rem !important;
          }

          .ggst-intel-feed__empty {
            min-height: 1.58rem !important;
            padding: 0.22rem 0.46rem !important;
            gap: 0.4rem !important;
          }

          .ggst-intel-feed__empty-prefix {
            min-width: 2.2rem;
            font-size: 0.68rem !important;
          }

          .ggst-intel-feed__empty-text {
            font-size: 0.68rem !important;
            letter-spacing: 0.05em;
          }

          .ggst-intel-item {
            min-height: 1.68rem;
            padding: 0.34rem 0.46rem !important;
            border: 1px solid rgba(58, 64, 74, 0.8);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.016), rgba(255, 255, 255, 0)),
              #12161c !important;
          }

          .ggst-intel-item__meta,
          .ggst-intel-item__comment {
            font-size: 0.72rem !important;
            line-height: 1.3;
          }

          .ggst-bet-panel {
            --ggst-bet-heat-edge: rgba(213, 16, 30, 0.22);
            --ggst-bet-heat-edge-strong: rgba(213, 16, 30, 0.58);
            --ggst-bet-heat-bottom: rgba(213, 16, 30, 0.4);
            --ggst-bet-heat-glow: rgba(213, 16, 30, 0.08);
            --ggst-bet-heat-fill: linear-gradient(90deg, #3d0f14 0%, #7d111b 35%, #d5101e 72%, #ff2a2a 100%);
            position: relative;
            overflow: hidden;
            border-color: rgba(54, 60, 70, 0.96) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #15181d, #0b0d11) !important;
            box-shadow:
              5px 5px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.014) !important;
          }

          .ggst-bet-panel::after {
            content: "";
            position: absolute;
            left: 0.78rem;
            right: 0.78rem;
            bottom: 0.52rem;
            height: 3px;
            background: linear-gradient(90deg, rgba(213, 16, 30, 0.16), rgba(213, 16, 30, 0.04));
            box-shadow: 0 0 8px rgba(213, 16, 30, 0.06);
            pointer-events: none;
          }

          .ggst-bet-panel--heat-2 {
            --ggst-bet-heat-edge: rgba(213, 16, 30, 0.34);
            --ggst-bet-heat-edge-strong: rgba(213, 16, 30, 0.68);
            --ggst-bet-heat-bottom: rgba(213, 16, 30, 0.62);
            --ggst-bet-heat-glow: rgba(213, 16, 30, 0.12);
            --ggst-bet-heat-fill: linear-gradient(90deg, #521116 0%, #a3131d 38%, #d5101e 76%, #ff3f32 100%);
          }

          .ggst-bet-panel--heat-3 {
            --ggst-bet-heat-edge: rgba(240, 74, 43, 0.42);
            --ggst-bet-heat-edge-strong: rgba(240, 74, 43, 0.78);
            --ggst-bet-heat-bottom: rgba(240, 74, 43, 0.76);
            --ggst-bet-heat-glow: rgba(240, 74, 43, 0.16);
            --ggst-bet-heat-fill: linear-gradient(90deg, #6d1619 0%, #cf251f 34%, #f04a2b 72%, #ff8245 100%);
          }

          .ggst-bet-panel--heat-4 {
            --ggst-bet-heat-edge: rgba(240, 74, 43, 0.58);
            --ggst-bet-heat-edge-strong: rgba(255, 131, 53, 0.9);
            --ggst-bet-heat-bottom: rgba(199, 161, 40, 0.88);
            --ggst-bet-heat-glow: rgba(255, 139, 61, 0.22);
            --ggst-bet-heat-fill: linear-gradient(90deg, #7f1715 0%, #d6281e 24%, #f04a2b 58%, #ff8b35 84%, #c7a128 100%);
          }

          .ggst-bet-panel__thermo {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            align-items: center;
            gap: 0.46rem;
            margin: 0.06rem 0 0.56rem;
          }

          .ggst-bet-panel__thermo-badge {
            display: inline-flex;
            align-items: center;
            min-height: 1.35rem;
            padding: 0.12rem 0.42rem;
            border: 1px solid rgba(75, 80, 88, 0.94);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.016), rgba(255, 255, 255, 0)),
              #0c0f13;
            color: #d9d2c5;
            font-family: var(--font-geist-mono);
            font-size: 0.56rem;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%);
          }

          .ggst-bet-panel__thermo-badge--2 {
            border-color: rgba(154, 36, 44, 0.82);
            color: #f0ddd8;
          }

          .ggst-bet-panel__thermo-badge--3 {
            border-color: rgba(201, 73, 51, 0.86);
            color: #fff0e0;
          }

          .ggst-bet-panel__thermo-badge--4 {
            border-color: rgba(199, 161, 40, 0.88);
            background:
              linear-gradient(180deg, rgba(199, 161, 40, 0.12), rgba(0, 0, 0, 0)),
              #151008;
            color: #fff3d2;
          }

          .ggst-bet-panel__thermo-track {
            position: relative;
            overflow: hidden;
            height: 0.46rem;
            border: 1px solid rgba(55, 61, 70, 0.96);
            background: #07090c;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
          }

          .ggst-bet-panel__thermo-fill {
            display: block;
            width: var(--ggst-bet-heat-percent);
            height: 100%;
            background: var(--ggst-bet-heat-fill);
            box-shadow: 0 0 10px var(--ggst-bet-heat-glow);
            transition: width 160ms ease, box-shadow 160ms ease, background 160ms ease;
          }

          .ggst-bet-panel__thermo-value {
            min-width: 2.4rem;
            text-align: right;
            font-family: var(--font-geist-mono);
            font-size: 0.62rem;
            font-weight: 700;
            letter-spacing: 0.14em;
            color: #cbbca0;
          }

          .ggst-bet-panel__hint {
            color: #c7a128 !important;
          }

          .ggst-quick-chip {
            min-height: 2.32rem !important;
            border: 1px solid rgba(77, 84, 94, 0.96) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.018), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #16191f, #0b0d11) !important;
            box-shadow:
              0 3px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.018) !important;
            color: #f0ece3 !important;
            clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
            transition:
              border-color 140ms ease,
              background 140ms ease,
              box-shadow 140ms ease,
              color 140ms ease,
              transform 140ms ease;
          }

          .ggst-quick-chip:hover:not(:disabled) {
            transform: translateY(1px);
          }

          .ggst-quick-chip--all {
            border-color: rgba(213, 16, 30, 0.92) !important;
            background:
              linear-gradient(180deg, rgba(255, 42, 42, 0.22), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #3b0f15, #17080c) !important;
            box-shadow:
              0 3px 0 #000000,
              inset 0 0 0 1px rgba(255, 139, 139, 0.12) !important;
            color: #fff3ec !important;
          }

          .ggst-bet-panel--heat-2 .ggst-quick-chip:not(.ggst-quick-chip--all) {
            border-color: rgba(213, 16, 30, 0.46) !important;
          }

          .ggst-bet-panel--heat-3 .ggst-quick-chip:not(.ggst-quick-chip--all) {
            border-color: rgba(240, 74, 43, 0.56) !important;
            background:
              linear-gradient(180deg, rgba(240, 74, 43, 0.08), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #1d1215, #0b0d11) !important;
          }

          .ggst-bet-panel--heat-4 .ggst-quick-chip:not(.ggst-quick-chip--all) {
            border-color: rgba(255, 139, 53, 0.72) !important;
            box-shadow:
              0 3px 0 #000000,
              inset 0 0 0 1px rgba(255, 210, 132, 0.08),
              0 0 12px rgba(255, 139, 53, 0.08) !important;
          }

          .ggst-bet-panel--heat-3 .ggst-quick-chip--all {
            background:
              linear-gradient(180deg, rgba(240, 74, 43, 0.28), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #4a1516, #1a090c) !important;
          }

          .ggst-bet-panel--heat-4 .ggst-quick-chip--all {
            border-color: rgba(255, 154, 73, 0.96) !important;
            background:
              linear-gradient(180deg, rgba(255, 139, 53, 0.34), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #5d1713, #21090a) !important;
            box-shadow:
              0 3px 0 #000000,
              inset 0 0 0 1px rgba(255, 224, 160, 0.16),
              0 0 14px rgba(255, 139, 53, 0.14) !important;
          }

          .ggst-bet-input,
          .ggst-comment-input {
            border: 1px solid rgba(60, 66, 76, 0.96) !important;
            border-bottom: 3px solid var(--ggst-bet-heat-bottom) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
              #07090c !important;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.02),
              inset 0 -1px 0 rgba(0, 0, 0, 0.52) !important;
            color: #f0ece3 !important;
            transition:
              border-color 150ms ease,
              border-bottom-color 150ms ease,
              box-shadow 150ms ease,
              background 150ms ease;
          }

          .ggst-bet-panel--heat-2 .ggst-bet-input,
          .ggst-bet-panel--heat-2 .ggst-comment-input {
            border-color: rgba(95, 43, 49, 0.96) !important;
          }

          .ggst-bet-panel--heat-3 .ggst-bet-input {
            border-color: rgba(145, 49, 41, 0.96) !important;
            background:
              linear-gradient(180deg, rgba(240, 74, 43, 0.08), rgba(0, 0, 0, 0)),
              #08090c !important;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.02),
              inset 0 -1px 0 rgba(0, 0, 0, 0.56),
              0 0 0 1px rgba(0, 0, 0, 0.42) !important;
          }

          .ggst-bet-panel--heat-4 .ggst-bet-input {
            border-color: rgba(192, 85, 46, 0.96) !important;
            border-bottom-color: rgba(199, 161, 40, 0.92) !important;
            background:
              linear-gradient(180deg, rgba(255, 139, 53, 0.12), rgba(0, 0, 0, 0)),
              #08090b !important;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.025),
              inset 0 -1px 0 rgba(0, 0, 0, 0.6),
              0 0 12px rgba(255, 139, 53, 0.08) !important;
          }

          .ggst-bet-panel__tools,
          .ggst-bet-actions {
            position: relative;
            z-index: 1;
          }

          .ggst-choice-button {
            min-height: 4.28rem !important;
            border: 1px solid rgba(67, 74, 85, 0.96) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.016), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #191d24, #0d1015) !important;
            box-shadow:
              5px 5px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.016) !important;
          }

          .ggst-choice-button::after {
            content: "";
            position: absolute;
            left: 0.55rem;
            right: 0.55rem;
            bottom: 0.34rem;
            height: 2px;
            background: linear-gradient(90deg, rgba(255, 255, 255, 0.04), transparent);
            opacity: 0.9;
            pointer-events: none;
          }

          .ggst-choice-button--a::after {
            background: linear-gradient(90deg, rgba(213, 16, 30, 0.44), transparent 90%);
          }

          .ggst-choice-button--b::after {
            background: linear-gradient(90deg, rgba(78, 104, 184, 0.44), transparent 90%);
          }

          .ggst-bet-panel--target-a .ggst-choice-button--a,
          .ggst-bet-panel--target-b .ggst-choice-button--b {
            box-shadow:
              5px 5px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.02),
              0 0 12px var(--ggst-bet-heat-glow) !important;
          }

          .ggst-bet-panel--target-a .ggst-choice-button--a {
            border-color: rgba(213, 16, 30, 0.92) !important;
            background:
              linear-gradient(180deg, rgba(213, 16, 30, 0.16), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #1d0e13, #0d090c) !important;
          }

          .ggst-bet-panel--target-b .ggst-choice-button--b {
            border-color: rgba(78, 104, 184, 0.94) !important;
            background:
              linear-gradient(180deg, rgba(78, 104, 184, 0.14), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #10141d, #090c12) !important;
          }

          .ggst-bet-panel--target-a .ggst-choice-button--b,
          .ggst-bet-panel--target-b .ggst-choice-button--a {
            opacity: 0.82 !important;
          }

          .ggst-bet-panel--heat-3.ggst-bet-panel--target-a .ggst-choice-button--a,
          .ggst-bet-panel--heat-4.ggst-bet-panel--target-a .ggst-choice-button--a {
            background:
              linear-gradient(180deg, rgba(240, 74, 43, 0.24), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #2b1014, #10080a) !important;
          }

          .ggst-bet-panel--heat-3.ggst-bet-panel--target-b .ggst-choice-button--b,
          .ggst-bet-panel--heat-4.ggst-bet-panel--target-b .ggst-choice-button--b {
            background:
              linear-gradient(180deg, rgba(78, 104, 184, 0.16), rgba(240, 74, 43, 0.08), rgba(0, 0, 0, 0)),
              linear-gradient(180deg, #121726, #090c12) !important;
            box-shadow:
              5px 5px 0 #000000,
              inset 0 0 0 1px rgba(156, 178, 255, 0.05),
              0 0 10px rgba(78, 104, 184, 0.1),
              0 0 12px rgba(240, 74, 43, 0.08) !important;
          }

          .ggst-bet-panel--heat-4 .ggst-choice-button__prefix {
            color: #f1d7a5 !important;
          }

          /* ArcSys syntax refine: asymmetric plates, mounted signs, offset pressure */
          .ggst-clash-card {
            clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
          }

          .ggst-hero-plate,
          .ggst-control-module,
          .ggst-intel-feed,
          .ggst-bet-panel,
          .ggst-bounty-board {
            position: relative;
            overflow: hidden;
          }

          .ggst-hero-plate {
            clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
          }

          .ggst-hero-plate::after {
            content: "";
            position: absolute;
            top: -1px;
            right: 1.2rem;
            width: 3rem;
            height: 0.42rem;
            background: linear-gradient(90deg, rgba(213, 16, 30, 0.94), rgba(255, 42, 42, 0.46));
            clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
            box-shadow: 2px 2px 0 #000000;
            opacity: 0.9;
          }

          .ggst-control-module {
            clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
          }

          .ggst-control-module::after {
            content: "";
            position: absolute;
            top: 0.42rem;
            right: -1px;
            width: 0.56rem;
            height: calc(100% - 1rem);
            background: linear-gradient(180deg, rgba(199, 161, 40, 0.18), rgba(0, 0, 0, 0));
            clip-path: polygon(100% 0, 100% 100%, 0 calc(100% - 18px), 0 18px);
            opacity: 0.78;
          }

          .ggst-intel-feed {
            clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
          }

          .ggst-intel-feed::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0.72rem;
            width: 2.6rem;
            height: 2px;
            background: linear-gradient(90deg, rgba(199, 161, 40, 0.92), rgba(255, 255, 255, 0.16));
            box-shadow: 2px 2px 0 #000000;
          }

          .ggst-pool-readout__label,
          .ggst-meter-summary__chip,
          .ggst-fighter-card__side-tag,
          .ggst-intel-feed__label,
          .ggst-bet-panel__label {
            box-shadow: 2px 2px 0 #000000 !important;
          }

          .ggst-pool-readout__label,
          .ggst-meter-summary__chip,
          .ggst-fighter-card__side-tag,
          .ggst-intel-feed__label {
            clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%);
          }

          .ggst-fighter-card {
            overflow: hidden;
          }

          .ggst-fighter-card--a {
            clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
          }

          .ggst-fighter-card--b {
            clip-path: polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px);
          }

          .ggst-fighter-card::after {
            content: "";
            position: absolute;
            bottom: 0;
            width: 2.1rem;
            height: 3px;
            background: linear-gradient(90deg, rgba(255, 255, 255, 0.18), rgba(0, 0, 0, 0));
            opacity: 0.74;
            pointer-events: none;
          }

          .ggst-fighter-card--a::after {
            left: 0;
            background: linear-gradient(90deg, rgba(213, 16, 30, 0.64), rgba(0, 0, 0, 0));
          }

          .ggst-fighter-card--b::after {
            right: 0;
            background: linear-gradient(90deg, rgba(78, 104, 184, 0.64), rgba(0, 0, 0, 0));
          }

          .ggst-matchup-vs::before {
            inset: 24% 18% 28% 20% !important;
            clip-path: polygon(10px 0, 100% 0, calc(100% - 14px) 100%, 0 100%, 0 12px);
          }

          .ggst-matchup-vs::after {
            inset: 29% 16% 27% 23% !important;
            clip-path: polygon(14px 0, 100% 0, calc(100% - 18px) 100%, 0 100%, 0 18px);
            transform: skewX(-7deg);
          }

          .ggst-matchup-vs__versus::before {
            content: "";
            position: absolute;
            inset: 0.62rem -0.8rem 0.7rem;
            z-index: -1;
            background: linear-gradient(180deg, rgba(213, 16, 30, 0.22), rgba(0, 0, 0, 0));
            clip-path: polygon(12px 0, 100% 0, calc(100% - 14px) 100%, 0 100%, 0 10px);
            opacity: 0.9;
          }

          .ggst-bet-panel {
            clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
          }

          .ggst-bet-panel__label {
            padding-right: 0.42rem;
          }

          .ggst-bet-panel__label::after {
            content: "";
            width: 1.1rem;
            height: 1px;
            background: linear-gradient(90deg, rgba(199, 161, 40, 0.86), rgba(0, 0, 0, 0));
            margin-left: 0.1rem;
          }

          .ggst-bounty-board {
            clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 14px 100%, 0 calc(100% - 12px));
          }

          .ggst-bounty-board::after {
            content: "";
            position: absolute;
            top: 0.9rem;
            right: -1px;
            width: 0.8rem;
            height: calc(100% - 1.8rem);
            background: linear-gradient(180deg, rgba(213, 16, 30, 0.24), rgba(0, 0, 0, 0));
            clip-path: polygon(100% 0, 100% 100%, 0 calc(100% - 14px), 0 14px);
            opacity: 0.78;
          }

          .ggst-bounty-board__header {
            position: relative;
            margin-right: 0.52rem;
          }

          .ggst-bounty-board__title-band {
            display: inline-flex;
            padding: 0.18rem 0.5rem 0.16rem;
            clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 100%, 0 100%);
            box-shadow: 2px 2px 0 #000000;
          }

          .ggst-bounty-board__item--first {
            margin-right: 0.32rem;
          }

          .ggst-bounty-board__item--top {
            margin-right: 0.14rem;
          }

          .ggst-bounty-board__seal {
            clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%);
          }

          .ggst-pool-readout__label.ggst-micro-plate--pool {
            min-height: 1.22rem !important;
            padding: 0.12rem 0.48rem !important;
            border: 1px solid rgba(82, 90, 103, 0.96) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #1b2027, #10141a) !important;
            color: #f2eee5 !important;
            box-shadow:
              2px 2px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.02) !important;
          }

          .ggst-meter-summary__chip.ggst-micro-plate--stage {
            min-height: 1.34rem !important;
            padding: 0.15rem 0.56rem !important;
            border: 1px solid rgba(154, 126, 42, 0.92) !important;
            background:
              linear-gradient(180deg, rgba(199, 161, 40, 0.16), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #21180d, #120d08) !important;
            color: #f1d27a !important;
            box-shadow:
              2px 2px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.025) !important;
          }

          .ggst-fighter-card__side-tag.ggst-micro-plate--fighter {
            min-height: 1.12rem !important;
            padding: 0.12rem 0.42rem !important;
            border: 1px solid rgba(63, 72, 86, 0.94) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #14181f, #0a0d12) !important;
            color: #ebe6dd !important;
            box-shadow: 2px 2px 0 #000000 !important;
          }

          .ggst-intel-feed__label {
            min-height: 1.42rem !important;
            padding: 0.16rem 0.52rem !important;
            border: 1px solid rgba(77, 67, 28, 0.9) !important;
            background:
              linear-gradient(180deg, rgba(199, 161, 40, 0.12), rgba(255, 255, 255, 0)),
              linear-gradient(180deg, #15110b, #0d0a07) !important;
            color: #f2eee5 !important;
            clip-path: none !important;
            transform: none !important;
            box-shadow:
              2px 2px 0 #000000,
              inset 0 0 0 1px rgba(255, 255, 255, 0.02) !important;
          }

          .ggst-player-avatar__fallback {
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.07), transparent 34%),
              linear-gradient(180deg, rgba(15, 18, 24, 0.08), rgba(4, 5, 7, 0.64)) !important;
          }

          .ggst-player-avatar__fallback-mark {
            font-size: 1.78rem !important;
            letter-spacing: 0.04em !important;
          }

          .ggst-player-avatar__fallback-mark--pair {
            font-size: 1.5rem !important;
            letter-spacing: 0.06em !important;
          }

          @media (max-width: 1023px) {
            .ggst-command-rail {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
