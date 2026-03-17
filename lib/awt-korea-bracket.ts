import {
  buildCaseInsensitiveKey,
  buildGroupStandings,
  type GroupStanding,
  type MatchIdentityInput,
} from "./tournament-data";

export type MatchRefSlot = "A" | "B";

interface GroupSource {
  type: "group";
  group: string;
  placement: 1 | 2;
}

interface StaticSource {
  type: "static";
  label: string;
}

interface WinnerSource {
  type: "winner";
  matchKey: string;
  label: string;
}

interface LoserSource {
  type: "loser";
  matchKey: string;
  label: string;
}

type SeedSource = GroupSource | StaticSource | WinnerSource | LoserSource;

interface MatchLink {
  key: string;
  slot: MatchRefSlot;
}

export interface AwtKoreaBracketTemplateMatch {
  key: string;
  roundName: string;
  playerA: string;
  playerB: string;
  charA: string | null;
  charB: string | null;
  nextWinner: MatchLink | null;
  nextLoser: MatchLink | null;
}

interface TemplateDefinition {
  key: string;
  roundName: string;
  playerASource: SeedSource;
  playerBSource: SeedSource;
  nextWinner: MatchLink | null;
  nextLoser: MatchLink | null;
}

export interface ResolvedParticipant {
  name: string;
  charName: string | null;
}

const GROUP_SLOT_REGEX = /^([A-D])\u7ec4\u7b2c([12\u4e00\u4e8c])$/;

const AWT_KOREA_TEMPLATE: readonly TemplateDefinition[] = [
  {
    key: "awt-playin-1",
    roundName: "Play-In",
    playerASource: { type: "group", group: "A", placement: 2 },
    playerBSource: { type: "group", group: "B", placement: 2 },
    nextWinner: { key: "awt-l1-1", slot: "B" },
    nextLoser: null,
  },
  {
    key: "awt-playin-2",
    roundName: "Play-In",
    playerASource: { type: "group", group: "C", placement: 2 },
    playerBSource: { type: "group", group: "D", placement: 2 },
    nextWinner: { key: "awt-l1-2", slot: "B" },
    nextLoser: null,
  },
  {
    key: "awt-ws-1",
    roundName: "Winners Semi",
    playerASource: { type: "group", group: "A", placement: 1 },
    playerBSource: { type: "group", group: "B", placement: 1 },
    nextWinner: { key: "awt-wf", slot: "A" },
    nextLoser: { key: "awt-l2-1", slot: "A" },
  },
  {
    key: "awt-ws-2",
    roundName: "Winners Semi",
    playerASource: { type: "group", group: "C", placement: 1 },
    playerBSource: { type: "group", group: "D", placement: 1 },
    nextWinner: { key: "awt-wf", slot: "B" },
    nextLoser: { key: "awt-l2-2", slot: "A" },
  },
  {
    key: "awt-l1-1",
    roundName: "Losers Round 1",
    playerASource: { type: "static", label: "LCQ 1" },
    playerBSource: { type: "winner", matchKey: "awt-playin-1", label: "\u9644\u52a0\u8d5b\u80dc\u8005 1" },
    nextWinner: { key: "awt-l2-1", slot: "B" },
    nextLoser: null,
  },
  {
    key: "awt-l1-2",
    roundName: "Losers Round 1",
    playerASource: { type: "static", label: "LCQ 2" },
    playerBSource: { type: "winner", matchKey: "awt-playin-2", label: "\u9644\u52a0\u8d5b\u80dc\u8005 2" },
    nextWinner: { key: "awt-l2-2", slot: "B" },
    nextLoser: null,
  },
  {
    key: "awt-l2-1",
    roundName: "Losers Round 2",
    playerASource: { type: "loser", matchKey: "awt-ws-1", label: "\u80dc\u8005\u7ec4\u534a\u51b3 1 \u8d25\u8005" },
    playerBSource: { type: "winner", matchKey: "awt-l1-1", label: "\u8d25\u8005\u7ec4\u9996\u8f6e 1 \u80dc\u8005" },
    nextWinner: { key: "awt-ls", slot: "A" },
    nextLoser: null,
  },
  {
    key: "awt-l2-2",
    roundName: "Losers Round 2",
    playerASource: { type: "loser", matchKey: "awt-ws-2", label: "\u80dc\u8005\u7ec4\u534a\u51b3 2 \u8d25\u8005" },
    playerBSource: { type: "winner", matchKey: "awt-l1-2", label: "\u8d25\u8005\u7ec4\u9996\u8f6e 2 \u80dc\u8005" },
    nextWinner: { key: "awt-ls", slot: "B" },
    nextLoser: null,
  },
  {
    key: "awt-wf",
    roundName: "Winners Final",
    playerASource: { type: "winner", matchKey: "awt-ws-1", label: "\u80dc\u8005\u7ec4\u534a\u51b3 1 \u80dc\u8005" },
    playerBSource: { type: "winner", matchKey: "awt-ws-2", label: "\u80dc\u8005\u7ec4\u534a\u51b3 2 \u80dc\u8005" },
    nextWinner: { key: "awt-gf", slot: "A" },
    nextLoser: { key: "awt-lf", slot: "A" },
  },
  {
    key: "awt-ls",
    roundName: "Losers Semi",
    playerASource: { type: "winner", matchKey: "awt-l2-1", label: "\u8d25\u8005\u7ec4\u7b2c\u4e8c\u8f6e 1 \u80dc\u8005" },
    playerBSource: { type: "winner", matchKey: "awt-l2-2", label: "\u8d25\u8005\u7ec4\u7b2c\u4e8c\u8f6e 2 \u80dc\u8005" },
    nextWinner: { key: "awt-lf", slot: "B" },
    nextLoser: null,
  },
  {
    key: "awt-lf",
    roundName: "Losers Final",
    playerASource: { type: "loser", matchKey: "awt-wf", label: "\u80dc\u8005\u7ec4\u51b3\u8d5b \u8d25\u8005" },
    playerBSource: { type: "winner", matchKey: "awt-ls", label: "\u8d25\u8005\u7ec4\u534a\u51b3 \u80dc\u8005" },
    nextWinner: { key: "awt-gf", slot: "B" },
    nextLoser: null,
  },
  {
    key: "awt-gf",
    roundName: "Grand Final",
    playerASource: { type: "winner", matchKey: "awt-wf", label: "\u80dc\u8005\u7ec4\u51b3\u8d5b \u80dc\u8005" },
    playerBSource: { type: "winner", matchKey: "awt-lf", label: "\u8d25\u8005\u7ec4\u51b3\u8d5b \u80dc\u8005" },
    nextWinner: null,
    nextLoser: null,
  },
] as const;

export function formatMatchRef(matchId: string, slot: MatchRefSlot): string {
  return `${matchId}|${slot}`;
}

export function parseMatchRef(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(.*)\|([AB])$/);
  if (!match) {
    return { matchId: value, slot: null as MatchRefSlot | null };
  }

  return {
    matchId: match[1],
    slot: match[2] as MatchRefSlot,
  };
}

export function buildAwtKoreaBracketTemplate() {
  return AWT_KOREA_TEMPLATE.map((entry) => ({ ...entry }));
}

function getGroupSourceLabel(group: string, placement: 1 | 2) {
  return `${group}\u7ec4\u7b2c${placement === 1 ? "\u4e00" : "\u4e8c"}`;
}

function resolveGroupSource(source: GroupSource, standings: Record<string, GroupStanding[]>): ResolvedParticipant {
  const entry = standings[source.group]?.[source.placement - 1];
  if (!entry) {
    return { name: getGroupSourceLabel(source.group, source.placement), charName: null };
  }

  return {
    name: entry.name,
    charName: entry.charName ?? null,
  };
}

function resolveSource(source: SeedSource, standings: Record<string, GroupStanding[]>): ResolvedParticipant {
  if (source.type === "group") {
    return resolveGroupSource(source, standings);
  }

  return {
    name: source.label,
    charName: null,
  };
}

export function buildAwtKoreaBracketPlaceholderMatches(
  standings: Record<string, GroupStanding[]> = {},
): AwtKoreaBracketTemplateMatch[] {
  return AWT_KOREA_TEMPLATE.map((entry) => {
    const playerA = resolveSource(entry.playerASource, standings);
    const playerB = resolveSource(entry.playerBSource, standings);

    return {
      key: entry.key,
      roundName: entry.roundName,
      playerA: playerA.name,
      playerB: playerB.name,
      charA: playerA.charName,
      charB: playerB.charName,
      nextWinner: entry.nextWinner,
      nextLoser: entry.nextLoser,
    };
  });
}

export function resolveBracketPlaceholderParticipant(
  label: string,
  matches: readonly MatchIdentityInput[],
): ResolvedParticipant {
  const normalizedLabel = (label ?? "").trim();
  const standings = buildGroupStandings(matches);
  const match = normalizedLabel.match(GROUP_SLOT_REGEX);

  if (!match) {
    return {
      name: normalizedLabel,
      charName: null,
    };
  }

  const groupId = match[1].toUpperCase();
  const placement = match[2] === "1" || match[2] === "\u4e00" ? 1 : 2;
  return resolveGroupSource({ type: "group", group: groupId, placement }, standings);
}

export function resolveBracketDisplayMatches<T extends MatchIdentityInput>(matches: readonly T[]): T[] {
  return matches.map((match) => {
    if (buildCaseInsensitiveKey(match.stageType) !== "bracket") {
      return { ...match };
    }

    const playerA = resolveBracketPlaceholderParticipant(match.playerA, matches);
    const playerB = resolveBracketPlaceholderParticipant(match.playerB, matches);

    return {
      ...match,
      playerA: playerA.name,
      playerB: playerB.name,
      charA: match.charA ?? playerA.charName,
      charB: match.charB ?? playerB.charName,
    };
  });
}
