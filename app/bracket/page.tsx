"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import PlayerAvatar from "@/components/PlayerAvatar";
import BracketMatchNode from "@/components/BracketMatchNode";
<<<<<<< Updated upstream
=======
import { buildGroupStandings } from "@/lib/tournament-data";
import {
  buildAwtKoreaBracketPlaceholderMatches,
  formatMatchRef,
  parseMatchRef,
  resolveBracketDisplayMatches,
} from "@/lib/awt-korea-bracket";
>>>>>>> Stashed changes

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
  groupId?: string | null;
  roundName?: string | null;
  nextWinnerMatchId?: string | null;
  nextLoserMatchId?: string | null;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  matches: Match[];
}

<<<<<<< Updated upstream
interface PlayerStanding {
  name: string;
  points: number;
=======
interface PositionedMatch {
  match: Match;
  roundName: string;
  x: number;
  y: number;
  centerY: number;
  width: number;
  height: number;
}

interface SectorColumnLayout {
  roundName: string;
  x: number;
  matches: PositionedMatch[];
}

interface SectorLayout {
  top: number;
  width: number;
  height: number;
  contentTop: number;
  contentHeight: number;
  columns: SectorColumnLayout[];
  matchMap: Map<string, PositionedMatch>;
}

interface ConnectorSegment {
  key: string;
  variant: "winners" | "losers";
  sourceId: string;
  targetId: string;
  horizontalA: { left: number; top: number; width: number };
  vertical: { left: number; top: number; height: number };
  horizontalB: { left: number; top: number; width: number };
}

const BRACKET_NODE_WIDTH = 224;
const BRACKET_GRAND_NODE_WIDTH = 288;
const BRACKET_NODE_HEIGHT = 112;
const BRACKET_COLUMN_GAP = 136;
const BRACKET_ROUND_LABEL_HEIGHT = 72;
const BRACKET_SECTOR_PADDING_TOP = 82;
const BRACKET_SECTOR_PADDING_BOTTOM = 36;

function getRoundRank(roundName: string, losers: boolean) {
  const label = roundName.toLowerCase();

  if (label.includes("play-in") || label.includes("play in")) return losers ? 10 : 5;

  const numberMatch =
    label.match(/(?:round|wr|lr|w|l)\s*#?\s*(\d+)/i) ??
    label.match(/\b(\d+)\b/);

  if (numberMatch) {
    return Number.parseInt(numberMatch[1], 10);
  }

  if (label.includes("quarter")) return 40;
  if (label.includes("semi")) return 50;
  if ((label.includes("winner") || label.includes("loser")) && label.includes("final")) return 60;
  if (label === "lf") return 60;

  return losers ? 80 : 70;
}

function orderRoundNames(groupedMatches: Record<string, Match[]>, losers: boolean) {
  return Object.keys(groupedMatches).sort((left, right) => {
    const rankDiff = getRoundRank(left, losers) - getRoundRank(right, losers);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  });
}

function buildSectorLayout(
  groupedMatches: Record<string, Match[]>,
  losers: boolean,
  top: number,
): SectorLayout {
  const roundNames = orderRoundNames(groupedMatches, losers);
  const maxMatchesInRound = Math.max(1, ...roundNames.map((roundName) => groupedMatches[roundName].length));
  const contentHeight = Math.max(maxMatchesInRound * (BRACKET_NODE_HEIGHT + 72), BRACKET_NODE_HEIGHT + 72);
  const contentTop = BRACKET_ROUND_LABEL_HEIGHT + BRACKET_SECTOR_PADDING_TOP;
  const height = contentTop + contentHeight + BRACKET_SECTOR_PADDING_BOTTOM;
  const width =
    roundNames.length > 0
      ? roundNames.length * BRACKET_NODE_WIDTH + (roundNames.length - 1) * BRACKET_COLUMN_GAP
      : BRACKET_NODE_WIDTH;

  const columns: SectorColumnLayout[] = [];
  const matchMap = new Map<string, PositionedMatch>();

  roundNames.forEach((roundName, roundIndex) => {
    const matches = groupedMatches[roundName];
    const x = roundIndex * (BRACKET_NODE_WIDTH + BRACKET_COLUMN_GAP);
    const step = contentHeight / matches.length;

    const positionedMatches = matches.map((match, matchIndex) => {
      const localY = contentTop + step * matchIndex + Math.max(step / 2 - BRACKET_NODE_HEIGHT / 2, 0);
      const positionedMatch: PositionedMatch = {
        match,
        roundName,
        x,
        y: top + localY,
        centerY: top + localY + BRACKET_NODE_HEIGHT / 2,
        width: BRACKET_NODE_WIDTH,
        height: BRACKET_NODE_HEIGHT,
      };

      matchMap.set(match.id, positionedMatch);
      return positionedMatch;
    });

    columns.push({
      roundName,
      x,
      matches: positionedMatches,
    });
  });

  return {
    top,
    width,
    height,
    contentTop,
    contentHeight,
    columns,
    matchMap,
  };
}

function buildConnectorSegment(
  source: PositionedMatch,
  target: PositionedMatch,
  variant: "winners" | "losers",
  key: string,
): ConnectorSegment | null {
  const sourceRight = source.x + source.width;
  const targetLeft = target.x;

  if (targetLeft <= sourceRight) {
    return null;
  }

  const midX = sourceRight + Math.max(48, Math.floor((targetLeft - sourceRight) / 2));
  const top = Math.min(source.centerY, target.centerY);
  const height = Math.abs(source.centerY - target.centerY);

  return {
    key,
    variant,
    sourceId: source.match.id,
    targetId: target.match.id,
    horizontalA: {
      left: sourceRight,
      top: source.centerY,
      width: midX - sourceRight,
    },
    vertical: {
      left: midX,
      top,
      height,
    },
    horizontalB: {
      left: midX,
      top: target.centerY,
      width: targetLeft - midX,
    },
  };
}

function buildSectorConnectors(
  layout: SectorLayout,
  variant: "winners" | "losers",
  extraTargets: Map<string, PositionedMatch>,
  terminalFallback: PositionedMatch | null,
) {
  const connectors: ConnectorSegment[] = [];

  layout.columns.forEach((column, columnIndex) => {
    const nextColumn = layout.columns[columnIndex + 1];

    column.matches.forEach((node, matchIndex) => {
      let target =
        (node.match.nextWinnerMatchId
          ? (() => {
              const ref = parseMatchRef(node.match.nextWinnerMatchId);
              if (!ref?.matchId) {
                return null;
              }

              return layout.matchMap.get(ref.matchId) ?? extraTargets.get(ref.matchId) ?? null;
            })()
          : null) ?? null;

      if (!target && nextColumn) {
        const fallbackIndex = Math.min(
          nextColumn.matches.length - 1,
          Math.floor((matchIndex * nextColumn.matches.length) / Math.max(column.matches.length, 1)),
        );
        target = nextColumn.matches[fallbackIndex] ?? null;
      }

      if (!target && !nextColumn && terminalFallback) {
        target = terminalFallback;
      }

      if (!target) {
        return;
      }

      const connector = buildConnectorSegment(
        node,
        target,
        variant,
        `${variant}-${node.match.id}-${target.match.id}`,
      );

      if (connector) {
        connectors.push(connector);
      }
    });
  });

  return connectors;
}

function buildCrossSectorConnectors(
  sourceLayout: SectorLayout,
  targetLayout: SectorLayout,
  extraTargets: Map<string, PositionedMatch>,
) {
  const connectors: ConnectorSegment[] = [];

  sourceLayout.columns.forEach((column) => {
    column.matches.forEach((node) => {
      const ref = parseMatchRef(node.match.nextLoserMatchId);
      if (!ref?.matchId) {
        return;
      }

      const target = targetLayout.matchMap.get(ref.matchId) ?? extraTargets.get(ref.matchId) ?? null;
      if (!target) {
        return;
      }

      const connector = buildConnectorSegment(
        node,
        target,
        "losers",
        `losers-drop-${node.match.id}-${target.match.id}`,
      );

      if (connector) {
        connectors.push(connector);
      }
    });
  });

  return connectors;
}

function getStandingPresentation(placement: number) {
  if (placement === 0) {
    return {
      rowClass: "bg-emerald-950/35 text-white",
      pointsClass: "text-emerald-300",
      badgeClass: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
    };
  }

  if (placement === 1) {
    return {
      rowClass: "bg-amber-950/30 text-white",
      pointsClass: "text-amber-300",
      badgeClass: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    };
  }

  return {
    rowClass: "bg-neutral-950/35 text-neutral-300",
    pointsClass: "text-neutral-400",
    badgeClass: "border-neutral-600 bg-neutral-900/70 text-neutral-400",
  };
}

function getStandingDisplay(placement: number, groupSettled: boolean) {
  if (placement === 0) {
    return {
      badgeText: groupSettled ? "\u664b\u7ea7\u80dc\u8005\u7ec4" : "\u6682\u5217\u80dc\u8005\u7ec4",
      marker: "▲",
    };
  }

  if (placement === 1) {
    return {
      badgeText: groupSettled ? "\u9644\u52a0\u8d5b" : "\u6682\u5217\u9644\u52a0\u8d5b",
      marker: "●",
    };
  }

  return {
    badgeText: groupSettled ? "\u6dd8\u6c70" : "\u6682\u5217\u6dd8\u6c70",
    marker: "×",
  };
}

function translateRoundName(roundName: string) {
  switch (roundName) {
    case "Play-In":
      return "\u9644\u52a0\u8d5b";
    case "Winners Semi":
      return "\u80dc\u8005\u7ec4\u534a\u51b3\u8d5b";
    case "Winners Final":
      return "\u80dc\u8005\u7ec4\u51b3\u8d5b";
    case "Losers Round 1":
      return "\u8d25\u8005\u7ec4\u7b2c\u4e00\u8f6e";
    case "Losers Round 2":
      return "\u8d25\u8005\u7ec4\u7b2c\u4e8c\u8f6e";
    case "Losers Semi":
      return "\u8d25\u8005\u7ec4\u534a\u51b3\u8d5b";
    case "Losers Final":
      return "\u8d25\u8005\u7ec4\u51b3\u8d5b";
    case "Grand Final":
      return "\u603b\u51b3\u8d5b";
    case "Grand Final Reset":
      return "\u603b\u51b3\u8d5b\u91cd\u8d5b";
    default:
      return roundName;
  }
}

function getRoundGuide(roundName: string, losers: boolean) {
  const label = roundName.toLowerCase();

  if (label.includes("grand")) return "\u603b\u51b3\u8d5b\u88c1\u5b9a";
  if (label.includes("winner") && label.includes("final")) return "\u80dc\u8005\u76f4\u63a5\u8fdb\u5165\u603b\u51b3\u8d5b";
  if ((label.includes("loser") || label.includes("lf")) && label.includes("final")) return "\u8d25\u8005\u7ec4\u51a0\u519b\u4e89\u593a\u603b\u51b3\u8d5b";
  if (label.includes("semi")) return losers ? "\u518d\u8d25\u5373\u6dd8\u6c70" : "\u80dc\u8005\u7ee7\u7eed\u4e0a\u884c";
  if (label.includes("quarter")) return losers ? "\u8d25\u8005\u4fdd\u547d\u6218" : "\u80dc\u8005\u51b2\u51fb\u56db\u5f3a";
  if (label.includes("play-in") || label.includes("play in")) return losers ? "\u4e89\u593a\u8d25\u8005\u7ec4\u540d\u989d" : "\u9644\u52a0\u5e2d\u4f4d\u4e89\u593a";

  return losers ? "\u8d25\u8005\u518d\u8d25\u6dd8\u6c70" : "\u80dc\u8005\u664b\u7ea7\u4e0b\u4e00\u8f6e";
}

function getRoundCode(index: number, losers: boolean) {
  return `${losers ? "L" : "W"}-${String(index + 1).padStart(2, "0")}`;
}

function getMatchStatusLabel(status: string) {
  if (status === "SETTLED") return "\u5df2\u7ed3\u7b97";
  if (status === "OPEN") return "\u53ef\u4e0b\u6ce8";
  if (status === "LOCKED") return "\u5df2\u5c01\u76d8";
  return status;
>>>>>>> Stashed changes
}

export default function BracketPage() {
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"group" | "bracket">("group");

  useEffect(() => {
    fetchTournament();
  }, []);

  useEffect(() => {
    if (!tournament) {
      return;
    }

    const nextHasGroup = Object.keys(buildGroupStandings(tournament.matches)).length > 0;
    const nextHasBracket = tournament.matches.some((match) => match.stageType === "BRACKET");

    if (nextHasBracket && (!nextHasGroup || tournament.status === "BRACKET")) {
      setViewMode("bracket");
    } else if (nextHasGroup) {
      setViewMode("group");
    }
  }, [tournament]);

  const fetchTournament = async () => {
    try {
      const res = await fetch("/api/tournaments");
      if (res.ok) {
        const data = await res.json();
        setTournament(data.tournament);
      }
    } catch (err) {
      console.error("Failed to fetch tournament", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate Group Standings
  // In GGST Round Robins, advancement isn't just Match W/L; it's based on Round Points.
  // Add match.scoreA to Player A's total points, and match.scoreB to Player B's total points.
  // Sort leaderboard strictly descending by Total Points.
  const getGroupStandings = () => {
    if (!tournament) return {};

    const standings: Record<string, Record<string, PlayerStanding>> = {};

    tournament.matches.forEach((m) => {
      if (m.stageType !== "GROUP" || !m.groupId) return;

      const group = m.groupId;
      if (!standings[group]) standings[group] = {};

      // Initialize players if not exist
      if (!standings[group][m.playerA]) standings[group][m.playerA] = { name: m.playerA, points: 0 };
      if (!standings[group][m.playerB]) standings[group][m.playerB] = { name: m.playerB, points: 0 };

      if (m.status === "SETTLED") {
        if (typeof m.scoreA === 'number') {
          standings[group][m.playerA].points += m.scoreA;
        } else if (m.winner === 'A') {
          standings[group][m.playerA].points += 1;
        }

        if (typeof m.scoreB === 'number') {
          standings[group][m.playerB].points += m.scoreB;
        } else if (m.winner === 'B') {
          standings[group][m.playerB].points += 1;
        }
      }
    });

    // Convert to sorted arrays: sort leaderboard strictly descending by these Total Points
    const sortedStandings: Record<string, PlayerStanding[]> = {};
    for (const group in standings) {
      sortedStandings[group] = Object.values(standings[group]).sort((a, b) => b.points - a.points);
    }

    return sortedStandings;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111111]">
        <div className="font-anton text-3xl tracking-[0.16em] text-[#F1E9DF]">LOADING</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex min-h-[60vh] flex-col items-center justify-center">
            <h1 className="font-anton text-5xl tracking-[0.16em] text-[#F1E9DF]">NO ACTIVE TOURNAMENT</h1>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

<<<<<<< Updated upstream
  const groupStandings = getGroupStandings();
=======
  const resolvedMatches = resolveBracketDisplayMatches(tournament.matches);
  const groupStandings = buildGroupStandings(resolvedMatches);
>>>>>>> Stashed changes
  const groups = Object.keys(groupStandings).sort();
  const groupMatchesById = Object.fromEntries(
    groups.map((group) => [
      group,
      resolvedMatches.filter((match) => match.groupId?.trim().toUpperCase() === group),
    ]),
  );

  const persistedBracketMatches = resolvedMatches.filter((match) => match.stageType === "BRACKET");
  const placeholderBracketMatches: Match[] = buildAwtKoreaBracketPlaceholderMatches(groupStandings).map((match) => ({
    id: match.key,
    playerA: match.playerA,
    playerB: match.playerB,
    charA: match.charA,
    charB: match.charB,
    status: "LOCKED",
    winner: null,
    scoreA: null,
    scoreB: null,
    stageType: "BRACKET",
    roundName: match.roundName,
    nextWinnerMatchId: match.nextWinner ? formatMatchRef(match.nextWinner.key, match.nextWinner.slot) : null,
    nextLoserMatchId: match.nextLoser ? formatMatchRef(match.nextLoser.key, match.nextLoser.slot) : null,
  }));
  const bracketMatches = persistedBracketMatches.length > 0 ? persistedBracketMatches : placeholderBracketMatches;

  const isWinnersRound = (label: string) =>
    !label.toLowerCase().includes("loser") &&
    !label.toLowerCase().includes("lf") &&
    !label.toLowerCase().includes("play-in") &&
    !label.toLowerCase().includes("play in");
  const isLosersRound = (label: string) =>
    label.toLowerCase().includes("loser") ||
    label.toLowerCase().includes("lf") ||
    label.toLowerCase().includes("play-in") ||
    label.toLowerCase().includes("play in");
  const isGrandFinals = (label: string) =>
    (label.toLowerCase().includes("grand") || label.toLowerCase().includes("gf")) &&
    !label.toLowerCase().includes("reset");
  const isGrandFinalReset = (label: string) =>
    label.toLowerCase().includes("grand final reset") || label.toLowerCase().includes("gf reset");

  const winnersMatches = bracketMatches.filter(
    (match) =>
      match.roundName &&
      isWinnersRound(match.roundName) &&
      !isGrandFinals(match.roundName) &&
      !isGrandFinalReset(match.roundName),
  );
  const losersMatches = bracketMatches.filter((match) => match.roundName && isLosersRound(match.roundName));
  const grandFinals = bracketMatches.filter((match) => match.roundName && isGrandFinals(match.roundName));
  const grandFinalsReset = bracketMatches.filter((match) => match.roundName && isGrandFinalReset(match.roundName));

  const groupByRound = (matches: Match[]) => {
    const grouped: Record<string, Match[]> = {};
    matches.forEach((match) => {
      const roundName = match.roundName || "未分配轮次";
      if (!grouped[roundName]) {
        grouped[roundName] = [];
      }
      grouped[roundName].push(match);
    });
    return grouped;
  };

  const winnersLayout = buildSectorLayout(groupByRound(winnersMatches), false, 0);
  const dividerTop = winnersLayout.height + 28;
  const dividerHeight = 52;
  const losersTop = dividerTop + dividerHeight + 28;
  const losersLayout = buildSectorLayout(groupByRound(losersMatches), true, losersTop);
  const grandColumnX = Math.max(winnersLayout.width, losersLayout.width) + 204;
  const grandNodeY = dividerTop + Math.floor((dividerHeight - BRACKET_NODE_HEIGHT) / 2);
  const resetSlotX = grandColumnX + BRACKET_GRAND_NODE_WIDTH + 152;

  const grandFinalNode = grandFinals[0]
    ? {
        match: grandFinals[0],
        roundName: grandFinals[0].roundName || "Grand Final",
        x: grandColumnX,
        y: grandNodeY,
        centerY: grandNodeY + BRACKET_NODE_HEIGHT / 2,
        width: BRACKET_GRAND_NODE_WIDTH,
        height: BRACKET_NODE_HEIGHT,
      }
    : null;

  const grandResetNode = grandFinalsReset[0]
    ? {
        match: grandFinalsReset[0],
        roundName: grandFinalsReset[0].roundName || "Grand Final Reset",
        x: resetSlotX,
        y: grandNodeY,
        centerY: grandNodeY + BRACKET_NODE_HEIGHT / 2,
        width: BRACKET_GRAND_NODE_WIDTH,
        height: BRACKET_NODE_HEIGHT,
      }
    : null;

  const extraTargets = new Map<string, PositionedMatch>();
  if (grandFinalNode) {
    extraTargets.set(grandFinalNode.match.id, grandFinalNode);
  }
  if (grandResetNode) {
    extraTargets.set(grandResetNode.match.id, grandResetNode);
  }

  const winnersConnectors = buildSectorConnectors(winnersLayout, "winners", extraTargets, grandFinalNode);
  const losersConnectors = buildSectorConnectors(losersLayout, "losers", extraTargets, grandFinalNode);
  const losersDropConnectors = buildCrossSectorConnectors(winnersLayout, losersLayout, extraTargets);
  const grandResetConnector =
    grandFinalNode && grandResetNode
      ? buildConnectorSegment(grandFinalNode, grandResetNode, "winners", "grand-reset-link")
      : null;
  const canvasWidth = Math.max(
    resetSlotX + BRACKET_GRAND_NODE_WIDTH + 140,
    grandColumnX + BRACKET_GRAND_NODE_WIDTH + 320,
  );
  const canvasHeight = losersTop + losersLayout.height + 92;
  const hasGroupView = groups.length > 0;
  const hasBracketView = bracketMatches.length > 0;

  const getConnectorClassName = (connector: ConnectorSegment) => {
    const active =
      hoveredMatchId !== null &&
      (connector.sourceId === hoveredMatchId || connector.targetId === hoveredMatchId);

    return `bracket-line ${
      connector.variant === "winners" ? "bracket-line-winners" : "bracket-line-losers"
    } ${active ? "bracket-line--active" : ""}`;
  };

  const renderConnector = (connector: ConnectorSegment) => (
    <div key={connector.key}>
      <div
        className={getConnectorClassName(connector)}
        style={{
          left: `${connector.horizontalA.left}px`,
          top: `${connector.horizontalA.top}px`,
          width: `${connector.horizontalA.width}px`,
          height: "3px",
        }}
      />
      <div
        className={getConnectorClassName(connector)}
        style={{
          left: `${connector.vertical.left}px`,
          top: `${connector.vertical.top}px`,
          width: "3px",
          height: `${connector.vertical.height}px`,
        }}
      />
      <div
        className={getConnectorClassName(connector)}
        style={{
          left: `${connector.horizontalB.left}px`,
          top: `${connector.horizontalB.top}px`,
          width: `${connector.horizontalB.width}px`,
          height: "3px",
        }}
      />
    </div>
  );

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="relative z-10 h-full w-full p-4 sm:p-8">
          <div className="bracket-board-shell mx-auto mb-8 max-w-7xl">
            <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-500">
                  TOURNAMENT BOARD
                </div>
                <h1 className="mt-2 font-anton text-4xl tracking-[0.14em] text-[#F1E9DF]">
                  {tournament.name.toUpperCase()}
                </h1>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  {"\u5f53\u524d\u9636\u6bb5"} / {tournament.status.replaceAll("_", " ")}
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  {"\u8d5b\u7a0b\u89c6\u56fe"}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("group")}
                    disabled={!hasGroupView}
                    className={`border px-3 py-2 text-sm font-black tracking-[0.16em] transition ${
                      viewMode === "group"
                        ? "border-red-500 bg-red-600 text-white"
                        : "border-neutral-700 bg-black/50 text-neutral-300"
                    } ${!hasGroupView ? "cursor-not-allowed opacity-40" : ""}`}
                    style={{ fontFamily: "var(--font-bebas)" }}
                  >
                    {"\u5c0f\u7ec4\u8d5b"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("bracket")}
                    disabled={!hasBracketView}
                    className={`border px-3 py-2 text-sm font-black tracking-[0.16em] transition ${
                      viewMode === "bracket"
                        ? "border-red-500 bg-red-600 text-white"
                        : "border-neutral-700 bg-black/50 text-neutral-300"
                    } ${!hasBracketView ? "cursor-not-allowed opacity-40" : ""}`}
                    style={{ fontFamily: "var(--font-bebas)" }}
                  >
                    {"\u6dd8\u6c70\u8d5b"}
                  </button>
                </div>
              </div>
            </div>
          </div>

<<<<<<< Updated upstream
          {/* Group Stage Dashboard */}
          {tournament.status === "GROUP_STAGE" && groups.length > 0 ? (
            <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {groups.map((group) => (
                <motion.div
                  key={group}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
                >
                  {/* Standings Table */}
                  <div className="bg-black/80 border-2 border-neutral-700 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] transform -skew-x-2 relative">
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-600 pointer-events-none z-20"></div>
                    <div className="bg-neutral-900 p-4 border-b-2 border-neutral-800 flex justify-between items-center">
                      <h2 className="text-3xl font-black text-white tracking-widest transform skew-x-2 drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                        GROUP {group}
                      </h2>
                    </div>
                    <div className="p-1 transform skew-x-2">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-red-950/30 text-red-500 border-b border-red-900 font-bold tracking-widest text-sm" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}>
                            <th className="p-3">FIGHTER</th>
                            <th className="p-3 text-center w-32">POINTS (小分)</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-sm">
                          {groupStandings[group].map((player, idx) => {
                            // Find a match involving this player to get their character (optional)
                            const playerMatch = tournament.matches.find(m => m.playerA === player.name || m.playerB === player.name);
                            const charName = playerMatch ? (playerMatch.playerA === player.name ? playerMatch.charA : playerMatch.charB) : null;

                            return (
                              <tr key={player.name} className={`border-b border-neutral-800 ${idx === 0 ? 'bg-yellow-900/10 text-white' : 'text-neutral-300 hover:bg-neutral-900/50'}`}>
                                <td className="p-3 font-bold flex items-center gap-3">
                                  {idx === 0 && <span className="text-yellow-500 text-lg">👑</span>}
                                  <div className="w-10 h-10 flex-shrink-0">
                                    <PlayerAvatar
                                      playerName={player.name}
                                      charName={charName || ""}
                                      playerType="A" // Just to give it a border
                                    />
                                  </div>
                                  <span className="truncate">{player.name}</span>
                                </td>
                                <td className="p-3 text-center text-yellow-500 font-black">{player.points}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
=======
          {viewMode === "group" && hasGroupView ? (
            <div className="mx-auto max-w-7xl">
              <div className="bracket-info-shell mb-6 px-5 py-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-anton text-sm tracking-[0.3em] text-red-500">AWT KOREA FORMAT</span>
                    <span className="text-xs text-neutral-400">
                      {"\u5c0f\u7ec4\u7b2c\u4e00\u76f4\u8fdb\u80dc\u8005\u7ec4\uff0c\u5c0f\u7ec4\u7b2c\u4e8c\u8fdb\u5165\u9644\u52a0\u8d5b\uff0c\u5176\u4f59\u76f4\u63a5\u6dd8\u6c70\u3002"}
                    </span>
>>>>>>> Stashed changes
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-emerald-200">
                      {"\u664b\u7ea7\u80dc\u8005\u7ec4"}
                    </span>
                    <span className="border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-amber-200">
                      {"\u9644\u52a0\u8d5b"}
                    </span>
                    <span className="border border-neutral-600 bg-neutral-900/70 px-2 py-1 text-neutral-400">
                      {"\u6dd8\u6c70"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                {groups.map((group) => {
                  const groupMatches = groupMatchesById[group] ?? [];
                  const groupSettled =
                    groupMatches.length > 0 && groupMatches.every((match) => match.status === "SETTLED");

                  return (
                    <motion.div
                      key={group}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-6"
                    >
                      <div className="bracket-group-card relative">
                        <div className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-red-600" />
                        <div className="flex items-center justify-between border-b-2 border-neutral-800 bg-neutral-900 p-4">
                          <h2 className="font-anton text-3xl tracking-[0.14em] text-white">GROUP {group}</h2>
                          <span className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">
                            {groupSettled ? "\u5c0f\u7ec4\u5df2\u7ed3\u675f" : "\u5c0f\u7ec4\u8fdb\u884c\u4e2d"}
                          </span>
                        </div>

                        <div className="p-1">
                          <table className="w-full border-collapse text-left">
                            <thead>
                              <tr className="border-b border-red-900 bg-red-950/30 text-red-500">
                                <th className="p-3 font-anton text-xl tracking-[0.14em]">{"\u9009\u624b"}</th>
                                <th className="w-32 p-3 text-center font-anton text-xl tracking-[0.14em]">{"\u79ef\u5206"}</th>
                                <th className="w-40 p-3 text-center font-anton text-xl tracking-[0.14em]">{"\u53bb\u5411"}</th>
                              </tr>
                            </thead>
                            <tbody className="font-mono text-sm">
                              {groupStandings[group].map((player, idx) => {
                                const presentation = getStandingPresentation(idx);
                                const display = getStandingDisplay(idx, groupSettled);

                                return (
                                  <tr key={player.name} className={`border-b border-neutral-800 ${presentation.rowClass}`}>
                                    <td className="flex items-center gap-3 p-3 font-bold">
                                      <span className="text-base font-black">{display.marker}</span>
                                      <div className="h-10 w-10 flex-shrink-0">
                                        <PlayerAvatar
                                          playerName={player.name}
                                          charName={player.charName || ""}
                                          playerType="A"
                                        />
                                      </div>
                                      <span className="truncate">{player.name}</span>
                                    </td>
                                    <td className={`p-3 text-center font-black ${presentation.pointsClass}`}>
                                      {player.points}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span
                                        className={`inline-flex items-center justify-center border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${presentation.badgeClass}`}
                                      >
                                        {display.badgeText}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="bracket-subpanel p-4">
                        <h3 className="mb-3 font-anton text-xl tracking-[0.18em] text-neutral-500">{"\u7ec4\u5185\u5bf9\u5c40"}</h3>
                        <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
                          {groupMatches.map((match) => (
                            <div
                              key={match.id}
                              className="flex items-center justify-between border-l-2 border-neutral-700 bg-black/50 p-2 font-mono text-xs"
                            >
                              <div className="flex flex-1 items-center gap-2">
                                <span className={match.winner === "A" ? "font-bold text-yellow-500" : "text-neutral-300"}>
                                  {match.playerA}
                                </span>
                                <span className="text-[10px] text-neutral-600">vs</span>
                                <span className={match.winner === "B" ? "font-bold text-yellow-500" : "text-neutral-300"}>
                                  {match.playerB}
                                </span>
                              </div>
                              <div className="rounded bg-neutral-900 px-2 py-1 text-[10px]">
                                {getMatchStatusLabel(match.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === "bracket" && hasBracketView ? (
            <div className="mx-auto max-w-[calc(100vw-2rem)]">
              <div className="bracket-info-shell mx-auto mb-6 max-w-7xl px-5 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-red-500">
                      ELIMINATION BOARD
                    </div>
                    <h2 className="mt-2 font-anton text-3xl tracking-[0.14em] text-white">{"\u6dd8\u6c70\u8d5b\u6218\u533a"}</h2>
                    <p className="mt-2 max-w-3xl text-sm text-neutral-300">
                      {"\u80dc\u8005\u7ec4\u8f93\u4e00\u6b21\u6389\u5165\u8d25\u8005\u7ec4\uff0c\u8d25\u8005\u7ec4\u518d\u8f93\u5373\u6dd8\u6c70\uff1b\u603b\u51b3\u8d5b\u4e2d\uff0c\u8d25\u8005\u7ec4\u51fa\u7ebf\u9009\u624b\u9700\u8981\u8fde\u8d62\u4e24\u6b21\u3002"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.18em]">
                    <span className="border border-neutral-600 bg-neutral-900/70 px-3 py-1 text-neutral-200">
                      {"\u91d1\u5c5e\u7ebf / \u80dc\u8005\u664b\u7ea7"}
                    </span>
                    <span className="border border-red-800/70 bg-red-950/35 px-3 py-1 text-red-300">
                      {"\u7ea2\u7ebf / \u6389\u5165\u8d25\u8005\u7ec4"}
                    </span>
                    <span className="border border-amber-700/60 bg-amber-950/35 px-3 py-1 text-amber-200">
                      {"\u603b\u51b3\u8d5b / \u88c1\u51b3\u533a"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bracket-canvas-shell">
                <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
                  <div
                    className="bracket-topology-canvas relative"
                    style={{
                      width: `${canvasWidth}px`,
                      height: `${canvasHeight}px`,
                      padding: "5rem 6rem 5rem 4rem",
                    }}
                  >
                    <div className="bracket-topology-canvas__stage-mask" />

                    <div
                      className="bracket-sector bracket-sector--winners"
                      style={{ top: winnersLayout.top, width: winnersLayout.width, height: winnersLayout.height }}
                    >
                      <div className="bracket-sector__header">
                        <div className="bracket-sector__eyebrow">HEAVEN // WINNERS</div>
                        <h2 className="bracket-sector__title">{"\u80dc\u8005\u7ec4"}</h2>
                        <p className="bracket-sector__sub">{"\u8d62\u4e0b\u672c\u8f6e\u7ee7\u7eed\u4e0a\u884c\uff0c\u5931\u5229\u5c06\u6389\u5165\u8d25\u8005\u7ec4\u3002"}</p>
                      </div>

                      {winnersLayout.columns.map((column, index) => (
                        <div
                          key={`winners-${column.roundName}`}
                          className="bracket-sector__round-plate absolute"
                          style={{
                            left: `${column.x}px`,
                            top: `${BRACKET_ROUND_LABEL_HEIGHT}px`,
                            width: `${BRACKET_NODE_WIDTH}px`,
                          }}
                        >
                          <div className="bracket-sector__round-code">{getRoundCode(index, false)}</div>
                          <div className="bracket-sector__round-name">{translateRoundName(column.roundName)}</div>
                          <div className="bracket-sector__round-guide">{getRoundGuide(column.roundName, false)}</div>
                        </div>
                      ))}

                      {winnersLayout.columns.flatMap((column) =>
                        column.matches.map((entry) => (
                          <div
                            key={entry.match.id}
                            className="absolute"
                            style={{
                              left: `${entry.x}px`,
                              top: `${entry.y - winnersLayout.top}px`,
                              width: `${entry.width}px`,
                            }}
                          >
                            <BracketMatchNode
                              match={entry.match}
                              variant="winners"
                              isHighlighted={hoveredMatchId === entry.match.id}
                              onHoverStart={setHoveredMatchId}
                              onHoverEnd={() => setHoveredMatchId(null)}
                            />
                          </div>
                        )),
                      )}
                    </div>

                    <div
                      className="bracket-jagged-divider"
                      style={{ top: `${dividerTop}px`, width: `${Math.max(canvasWidth - 180, 720)}px` }}
                    />

                    <div
                      className="bracket-sector bracket-sector--losers"
                      style={{ top: losersLayout.top, width: losersLayout.width, height: losersLayout.height }}
                    >
                      <div className="bracket-sector__header bracket-sector__header--losers">
                        <div className="bracket-sector__eyebrow">HELL // LOSERS</div>
                        <h2 className="bracket-sector__title">{"\u8d25\u8005\u7ec4"}</h2>
                        <p className="bracket-sector__sub">{"\u6389\u5165\u8d25\u8005\u7ec4\u540e\u518d\u8f93\u4e00\u6b21\uff0c\u5373\u523b\u6dd8\u6c70\u3002"}</p>
                      </div>

                      {losersLayout.columns.map((column, index) => (
                        <div
                          key={`losers-${column.roundName}`}
                          className="bracket-sector__round-plate bracket-sector__round-plate--losers absolute"
                          style={{
                            left: `${column.x}px`,
                            top: `${BRACKET_ROUND_LABEL_HEIGHT}px`,
                            width: `${BRACKET_NODE_WIDTH}px`,
                          }}
                        >
                          <div className="bracket-sector__round-code">{getRoundCode(index, true)}</div>
                          <div className="bracket-sector__round-name">{translateRoundName(column.roundName)}</div>
                          <div className="bracket-sector__round-guide">{getRoundGuide(column.roundName, true)}</div>
                        </div>
                      ))}

                      {losersLayout.columns.flatMap((column) =>
                        column.matches.map((entry) => (
                          <div
                            key={entry.match.id}
                            className="absolute"
                            style={{
                              left: `${entry.x}px`,
                              top: `${entry.y - losersLayout.top}px`,
                              width: `${entry.width}px`,
                            }}
                          >
                            <BracketMatchNode
                              match={entry.match}
                              variant="losers"
                              isHighlighted={hoveredMatchId === entry.match.id}
                              onHoverStart={setHoveredMatchId}
                              onHoverEnd={() => setHoveredMatchId(null)}
                            />
                          </div>
                        )),
                      )}
                    </div>

                    {winnersConnectors.map(renderConnector)}
                    {losersConnectors.map(renderConnector)}
                    {losersDropConnectors.map(renderConnector)}

                    <div
                      className="bracket-grand-bay"
                      style={{
                        left: `${grandColumnX - 40}px`,
                        top: `${grandNodeY - 72}px`,
                        width: `${resetSlotX - grandColumnX + BRACKET_GRAND_NODE_WIDTH + 112}px`,
                        height: `${BRACKET_NODE_HEIGHT + 146}px`,
                      }}
                    >
                      <div className="bracket-grand-bay__eyebrow">JUDGMENT</div>
                      <div className="bracket-grand-bay__label">{"\u603b\u51b3\u8d5b"}</div>
                      <div className="bracket-grand-bay__sub">{"\u80dc\u8005\u7ec4\u51a0\u519b\u8fce\u6218\u8d25\u8005\u7ec4\u51a0\u519b\uff0c\u51b3\u5b9a\u6700\u7ec8\u540d\u989d\u3002"}</div>
                    </div>

                    {grandFinalNode && (
                      <div
                        className="absolute"
                        style={{
                          left: `${grandFinalNode.x}px`,
                          top: `${grandFinalNode.y}px`,
                          width: `${grandFinalNode.width}px`,
                        }}
                      >
                        <BracketMatchNode
                          match={grandFinalNode.match}
                          variant="grand"
                          isHighlighted={hoveredMatchId === grandFinalNode.match.id}
                          onHoverStart={setHoveredMatchId}
                          onHoverEnd={() => setHoveredMatchId(null)}
                        />
                      </div>
                    )}

                    {grandResetNode ? (
                      <div
                        className="absolute"
                        style={{
                          left: `${grandResetNode.x}px`,
                          top: `${grandResetNode.y}px`,
                          width: `${grandResetNode.width}px`,
                        }}
                      >
                        <BracketMatchNode
                          match={grandResetNode.match}
                          variant="reset"
                          isHighlighted={hoveredMatchId === grandResetNode.match.id}
                          onHoverStart={setHoveredMatchId}
                          onHoverEnd={() => setHoveredMatchId(null)}
                        />
                      </div>
                    ) : (
                      <div
                        className="bracket-reset-slot"
                        style={{
                          left: `${resetSlotX}px`,
                          top: `${grandNodeY}px`,
                          width: `${BRACKET_GRAND_NODE_WIDTH}px`,
                          height: `${BRACKET_NODE_HEIGHT}px`,
                        }}
                      >
                        <div className="bracket-reset-slot__label">{"\u603b\u51b3\u8d5b\u91cd\u8d5b"}</div>
                        <div className="bracket-reset-slot__sub">{"\u82e5\u8d25\u8005\u7ec4\u9009\u624b\u83b7\u80dc\uff0c\u5c06\u542f\u7528\u8be5\u5e2d\u4f4d"}</div>
                      </div>
                    )}

                    {grandResetConnector && renderConnector(grandResetConnector)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-7xl border border-neutral-800 bg-black/70 p-8 text-center">
              <div className="font-anton text-3xl tracking-[0.16em] text-neutral-200">
                {viewMode === "bracket"
                  ? "\u5f53\u524d\u8fd8\u6ca1\u6709\u53ef\u67e5\u770b\u7684\u6dd8\u6c70\u8d5b\u5bf9\u9635\u3002"
                  : "\u5f53\u524d\u8fd8\u6ca1\u6709\u53ef\u5c55\u793a\u7684\u5c0f\u7ec4\u8d5b\u6570\u636e\u3002"}
              </div>
              <div className="mt-3 text-sm text-neutral-500">
                {viewMode === "bracket"
                  ? "\u53ea\u8981\u540e\u53f0\u5df2\u751f\u6210\u6dd8\u6c70\u8d5b\u9aa8\u67b6\u6216\u5f55\u5165\u771f\u5b9e\u6dd8\u6c70\u8d5b\u5bf9\u9635\uff0c\u8fd9\u91cc\u5c31\u4f1a\u663e\u793a\u80dc\u8005\u7ec4\u3001\u8d25\u8005\u7ec4\u548c\u603b\u51b3\u8d5b\u3002"
                  : "\u5f55\u5165\u5c0f\u7ec4\u8d5b\u6570\u636e\u540e\uff0c\u8fd9\u91cc\u4f1a\u81ea\u52a8\u663e\u793a\u79ef\u5206\u3001\u540d\u6b21\u548c\u7ec4\u5185\u5bf9\u5c40\u3002"}
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
