export const PLAYER_ROSTER_SIZE = 16;
const BULK_VERSUS_REGEX = /^(.*?)\s+vs\.?\s+(.*?)$/i;

type NullableString = string | null | undefined;

export const PLAYER_ALIASES: Record<string, string> = {
  // AWT 2026 Korea Roster Map
  "leo.": "Leo.",
  "leo": "Leo.",
  "daru": "Daru_I-No",
  "daru_i-no": "Daru_I-No",
  "daru_ino": "Daru_I-No",
  "verix": "Verix",
  "gobou": "Gobou",
  "tatuma": "Tatuma",
  "sanakan": "Sanakan",
  "poka": "Poka",
  "haimera": "Haimera",
  "gg": "GG",
  "g.g": "GG",
  "danny": "Danny",
  "rookies_gb": "Rookies_GB",
  "rookiesgb": "Rookies_GB",
  "saunic": "Saunic",
  "nemo": "Nemo",
  "alioune": "Alioune",
  "baccpack": "Baccpack",
  "kyuniku": "Kyuniku",
  "tsurugi": "Tsurugi",
  "umisho": "UMISHO",
  "umisho ": "UMISHO",
  "umısho": "UMISHO",
  "slash": "Slash",
  "latif": "Latif",
  "skyll": "Skyll",
  "tempest": "TempestNYC",
  "tempestnyc": "TempestNYC",
  "peppery": "PepperySplash",
  "pepperysplash": "PepperySplash",
  "apology": "ApologyMan",
  "apologyman": "ApologyMan",
  "nitro": "Nitro",
  "ibushigin": "Ibushigin",
  "supernoon": "Supernoon",
  "razzo": "Razzo"
};

export interface MatchIdentityInput {
  id?: string;
  playerA: string;
  playerB: string;
  charA?: NullableString;
  charB?: NullableString;
  stageType?: NullableString;
  groupId?: NullableString;
  status?: NullableString;
  winner?: NullableString;
  scoreA?: number | null;
  scoreB?: number | null;
  createdAt?: Date | string | number;
}

export interface ParsedBulkMatch {
  playerA: string;
  playerB: string;
  charA: string | null;
  charB: string | null;
}

export interface BulkParseResult {
  matches: ParsedBulkMatch[];
  recentPlayers: string[];
}

export interface CanonicalMatchUpdate {
  id: string;
  playerA: string;
  playerB: string;
  charA: string | null;
  charB: string | null;
}

export interface GroupStanding {
  name: string;
  points: number;
  charName: string | null;
}

interface VariantStats {
  count: number;
  firstSeenOrder: number;
}

interface CanonicalMaps {
  playerMap: Map<string, string>;
  characterMap: Map<string, string>;
}

const CHARACTER_VARIANTS = [
  { canonical: "Sol", aliases: ["sol", "sol badguy"] },
  { canonical: "Ky", aliases: ["ky", "ky kiske"] },
  { canonical: "May", aliases: ["may"] },
  { canonical: "Axl", aliases: ["axl", "axl low"] },
  { canonical: "Chipp", aliases: ["chipp", "chipp zanuff"] },
  { canonical: "Potemkin", aliases: ["potemkin"] },
  { canonical: "Faust", aliases: ["faust"] },
  { canonical: "Millia", aliases: ["millia", "millia rage"] },
  { canonical: "Zato-1", aliases: ["zato", "zato1", "zato-1", "eddie"] },
  { canonical: "Ramlethal", aliases: ["ram", "ramlethal", "ramlethal valentine"] },
  { canonical: "Leo", aliases: ["leo", "leo whitefang"] },
  { canonical: "Nagoriyuki", aliases: ["nago", "nagoriyuki"] },
  { canonical: "Giovanna", aliases: ["gio", "giovanna"] },
  { canonical: "Anji", aliases: ["anji", "anji mito"] },
  { canonical: "I-No", aliases: ["ino", "i-no"] },
  { canonical: "Goldlewis", aliases: ["goldlewis", "goldlewis dickinson"] },
  { canonical: "Jack-O'", aliases: ["jacko", "jack-o", "jack-o'"] },
  { canonical: "Happy Chaos", aliases: ["happy chaos", "chaos"] },
  { canonical: "Baiken", aliases: ["baiken"] },
  { canonical: "Testament", aliases: ["testament"] },
  { canonical: "Bridget", aliases: ["bridget"] },
  { canonical: "Sin", aliases: ["sin", "sin kiske"] },
  { canonical: "Bedman?", aliases: ["bedman", "bedman?"] },
  { canonical: "Asuka", aliases: ["asuka", "asuka r", "asuka r#", "asuka r kreutz"] },
  { canonical: "Johnny", aliases: ["johnny"] },
  { canonical: "Elphelt", aliases: ["elphelt", "elphelt valentine"] },
  { canonical: "A.B.A", aliases: ["aba", "a.b.a", "a b a"] },
  { canonical: "Slayer", aliases: ["slayer"] },
  { canonical: "Dizzy", aliases: ["dizzy", "queen dizzy"] },
  { canonical: "Venom", aliases: ["venom"] },
];

export const OFFICIAL_CHARACTER_NAMES = CHARACTER_VARIANTS.map((entry) => entry.canonical);

const OFFICIAL_CHARACTER_MAP = new Map<string, string>();

for (const entry of CHARACTER_VARIANTS) {
  OFFICIAL_CHARACTER_MAP.set(buildLooseKey(entry.canonical), entry.canonical);
  for (const alias of entry.aliases) {
    OFFICIAL_CHARACTER_MAP.set(buildLooseKey(alias), entry.canonical);
  }
}

export function normalizeWhitespace(value: NullableString): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCaseInsensitiveKey(value: NullableString): string {
  return normalizeWhitespace(value).toLocaleLowerCase("en-US");
}

export function buildLooseKey(value: NullableString): string {
  return normalizeWhitespace(value)
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizePlayerName(value: NullableString): string {
  const normalizedWS = normalizeWhitespace(value);
  if (!normalizedWS) return "";

  const lower = normalizedWS.toLowerCase();
  if (PLAYER_ALIASES[lower]) {
    return PLAYER_ALIASES[lower];
  }

  // If not in alias dictionary, just return the normalized whitespace version
  // to avoid mutating user-provided casing unintentionally.
  return normalizedWS;
}

function normalizeCharacterInput(value: NullableString): string {
  return normalizeWhitespace(value);
}

function observeVariant(
  registry: Map<string, Map<string, VariantStats>>,
  value: NullableString,
  order: number,
) {
  const normalizedValue = normalizeWhitespace(value);
  if (!normalizedValue) {
    return;
  }

  const key = buildCaseInsensitiveKey(normalizedValue);
  const variants = registry.get(key) ?? new Map<string, VariantStats>();
  const existing = variants.get(normalizedValue);

  if (existing) {
    existing.count += 1;
  } else {
    variants.set(normalizedValue, {
      count: 1,
      firstSeenOrder: order,
    });
  }

  registry.set(key, variants);
}

function observeCharacterVariant(
  registry: Map<string, Map<string, VariantStats>>,
  value: NullableString,
  order: number,
) {
  const normalizedValue = normalizeCharacterName(value);
  if (!normalizedValue) {
    return;
  }

  const key = buildLooseKey(normalizedValue);
  const variants = registry.get(key) ?? new Map<string, VariantStats>();
  const existing = variants.get(normalizedValue);

  if (existing) {
    existing.count += 1;
  } else {
    variants.set(normalizedValue, {
      count: 1,
      firstSeenOrder: order,
    });
  }

  registry.set(key, variants);
}

function pickPreferredVariant(variants: Map<string, VariantStats>): string {
  return [...variants.entries()]
    .sort((left, right) => {
      const [, leftStats] = left;
      const [, rightStats] = right;

      if (rightStats.count !== leftStats.count) {
        return rightStats.count - leftStats.count;
      }

      if (leftStats.firstSeenOrder !== rightStats.firstSeenOrder) {
        return leftStats.firstSeenOrder - rightStats.firstSeenOrder;
      }

      return left[0].localeCompare(right[0], "en-US");
    })[0]?.[0] ?? "";
}

function buildPreferredMap(registry: Map<string, Map<string, VariantStats>>) {
  return new Map(
    [...registry.entries()].map(([key, variants]) => [key, pickPreferredVariant(variants)]),
  );
}

export function buildPlayerCanonicalMap(matches: readonly MatchIdentityInput[]): Map<string, string> {
  const registry = new Map<string, Map<string, VariantStats>>();
  let order = 0;

  for (const match of matches) {
    observeVariant(registry, match.playerA, order++);
    observeVariant(registry, match.playerB, order++);
  }

  return buildPreferredMap(registry);
}

export function buildCharacterCanonicalMap(matches: readonly MatchIdentityInput[]): Map<string, string> {
  const registry = new Map<string, Map<string, VariantStats>>();
  let order = 0;

  for (const match of matches) {
    observeCharacterVariant(registry, match.charA, order++);
    observeCharacterVariant(registry, match.charB, order++);
  }

  const preferredMap = buildPreferredMap(registry);

  for (const [key, value] of OFFICIAL_CHARACTER_MAP.entries()) {
    if (preferredMap.has(key)) {
      preferredMap.set(key, value);
    }
  }

  return preferredMap;
}

export function buildCanonicalMaps(matches: readonly MatchIdentityInput[]): CanonicalMaps {
  return {
    playerMap: buildPlayerCanonicalMap(matches),
    characterMap: buildCharacterCanonicalMap(matches),
  };
}

export function normalizeCharacterName(
  value: NullableString,
  canonicalMap?: Map<string, string>,
): string | null {
  const normalized = normalizeCharacterInput(value);
  if (!normalized) {
    return null;
  }

  const looseKey = buildLooseKey(normalized);
  if (looseKey && canonicalMap?.has(looseKey)) {
    return canonicalMap.get(looseKey) ?? null;
  }

  return OFFICIAL_CHARACTER_MAP.get(looseKey) ?? normalized;
}

export function canonicalizePlayerName(
  value: NullableString,
  canonicalMap?: Map<string, string>,
): string {
  const normalized = normalizePlayerName(value);
  if (!normalized) {
    return "";
  }

  return canonicalMap?.get(buildCaseInsensitiveKey(normalized)) ?? normalized;
}

export function normalizeMatchEntry(
  match: MatchIdentityInput,
  playerMap?: Map<string, string>,
  characterMap?: Map<string, string>,
): ParsedBulkMatch {
  return {
    playerA: canonicalizePlayerName(match.playerA, playerMap),
    playerB: canonicalizePlayerName(match.playerB, playerMap),
    charA: normalizeCharacterName(match.charA, characterMap),
    charB: normalizeCharacterName(match.charB, characterMap),
  };
}

export function getCanonicalMatchUpdates(matches: readonly MatchIdentityInput[]): CanonicalMatchUpdate[] {
  const { playerMap, characterMap } = buildCanonicalMaps(matches);
  const updates: CanonicalMatchUpdate[] = [];

  for (const match of matches) {
    if (!match.id) {
      continue;
    }

    const normalized = normalizeMatchEntry(match, playerMap, characterMap);
    const currentCharA = normalizeCharacterInput(match.charA) || null;
    const currentCharB = normalizeCharacterInput(match.charB) || null;

    if (
      normalized.playerA !== normalizePlayerName(match.playerA) ||
      normalized.playerB !== normalizePlayerName(match.playerB) ||
      normalized.charA !== currentCharA ||
      normalized.charB !== currentCharB
    ) {
      updates.push({
        id: match.id,
        ...normalized,
      });
    }
  }

  return updates;
}

export function parsePlayerAndCharacter(rawValue: string) {
  const normalized = normalizeWhitespace(rawValue);
  const match = normalized.match(/^(.*?)(?:\(([^()]+)\))?$/);

  if (!match) {
    return {
      player: normalized,
      char: null as string | null,
    };
  }

  return {
    player: normalizePlayerName(match[1]),
    char: normalizeCharacterName(match[2]),
  };
}

function registerCanonicalValue(map: Map<string, string>, value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return;
  }

  const key = buildCaseInsensitiveKey(normalized);
  if (!map.has(key)) {
    map.set(key, normalized);
  }
}

function registerCanonicalCharacter(map: Map<string, string>, value: NullableString) {
  const normalized = normalizeCharacterName(value);
  if (!normalized) {
    return;
  }

  const key = buildLooseKey(normalized);
  if (!map.has(key)) {
    map.set(key, normalized);
  }
}

export function parseBulkMatchInput(bulkInput: string, seedPlayers: readonly string[] = []): BulkParseResult {
  const lines = bulkInput
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
  const playerMap = new Map<string, string>();
  const characterMap = new Map<string, string>();
  const matches: ParsedBulkMatch[] = [];
  const recentPlayers: string[] = [];
  const seenRecentKeys = new Set<string>();

  for (const player of seedPlayers) {
    registerCanonicalValue(playerMap, player);
    const key = buildCaseInsensitiveKey(player);
    if (key && !seenRecentKeys.has(key)) {
      seenRecentKeys.add(key);
      recentPlayers.push(normalizePlayerName(player));
    }
  }

  for (const line of lines) {
    const versusMatch = line.match(BULK_VERSUS_REGEX);
    if (!versusMatch) {
      continue;
    }

    const left = parsePlayerAndCharacter(versusMatch[1]);
    const right = parsePlayerAndCharacter(versusMatch[2]);

    registerCanonicalValue(playerMap, left.player);
    registerCanonicalValue(playerMap, right.player);
    registerCanonicalCharacter(characterMap, left.char);
    registerCanonicalCharacter(characterMap, right.char);

    const parsedMatch = normalizeMatchEntry(
      {
        playerA: left.player,
        playerB: right.player,
        charA: left.char,
        charB: right.char,
      },
      playerMap,
      characterMap,
    );

    if (!parsedMatch.playerA || !parsedMatch.playerB) {
      continue;
    }

    matches.push(parsedMatch);

    for (const player of [parsedMatch.playerA, parsedMatch.playerB]) {
      const key = buildCaseInsensitiveKey(player);
      if (!seenRecentKeys.has(key)) {
        seenRecentKeys.add(key);
        recentPlayers.push(player);
      }
    }
  }

  return {
    matches,
    recentPlayers: recentPlayers.slice(0, PLAYER_ROSTER_SIZE),
  };
}

export function formatMatchLine(match: ParsedBulkMatch): string {
  const left = match.charA ? `${match.playerA} (${match.charA})` : match.playerA;
  const right = match.charB ? `${match.playerB} (${match.charB})` : match.playerB;
  return `${left} vs ${right}`;
}

export function normalizePlayerRoster(players: readonly string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const player of players) {
    const normalized = normalizePlayerName(player);
    if (!normalized) {
      continue;
    }

    const key = buildCaseInsensitiveKey(normalized);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);

    if (result.length === PLAYER_ROSTER_SIZE) {
      break;
    }
  }

  return result;
}

export function buildDefaultPlayerRoster(seedPlayers: readonly string[] = []): string[] {
  const roster = [...normalizePlayerRoster(seedPlayers)];
  while (roster.length < PLAYER_ROSTER_SIZE) {
    roster.push("");
  }
  return roster;
}

export function parsePlayerRosterSetting(value: NullableString): string[] {
  if (!value) {
    return buildDefaultPlayerRoster();
  }

  const rawValue = String(value).normalize("NFKC").trim();
  if (!rawValue) {
    return buildDefaultPlayerRoster();
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) {
      return buildDefaultPlayerRoster(parsed.filter((entry): entry is string => typeof entry === "string"));
    }
    return buildDefaultPlayerRoster();
  } catch {
    // Fallback to a plain text format for older values.
  }

  return buildDefaultPlayerRoster(rawValue.split(/\r?\n|,/));
}

export function serializePlayerRosterSetting(players: readonly string[]): string {
  return JSON.stringify(normalizePlayerRoster(players));
}

export function buildGroupStandings(matches: readonly MatchIdentityInput[]): Record<string, GroupStanding[]> {
  const { playerMap, characterMap } = buildCanonicalMaps(matches);
  const standings = new Map<string, Map<string, GroupStanding>>();

  for (const match of matches) {
    if (buildCaseInsensitiveKey(match.stageType) !== "group") {
      continue;
    }

    const groupId = normalizeWhitespace(match.groupId)?.toUpperCase();
    if (!groupId) {
      continue;
    }

    const normalizedMatch = normalizeMatchEntry(match, playerMap, characterMap);
    const groupStandings = standings.get(groupId) ?? new Map<string, GroupStanding>();

    for (const [player, charName] of [
      [normalizedMatch.playerA, normalizedMatch.charA],
      [normalizedMatch.playerB, normalizedMatch.charB],
    ] as const) {
      const playerKey = buildCaseInsensitiveKey(player);
      if (!groupStandings.has(playerKey)) {
        groupStandings.set(playerKey, {
          name: player,
          points: 0,
          charName,
        });
      } else if (!groupStandings.get(playerKey)?.charName && charName) {
        groupStandings.get(playerKey)!.charName = charName;
      }
    }

    if (buildCaseInsensitiveKey(match.status) === "settled") {
      const playerAKey = buildCaseInsensitiveKey(normalizedMatch.playerA);
      const playerBKey = buildCaseInsensitiveKey(normalizedMatch.playerB);

      if (typeof match.scoreA === "number") {
        groupStandings.get(playerAKey)!.points += match.scoreA;
      } else if (buildCaseInsensitiveKey(match.winner) === "a") {
        groupStandings.get(playerAKey)!.points += 1;
      }

      if (typeof match.scoreB === "number") {
        groupStandings.get(playerBKey)!.points += match.scoreB;
      } else if (buildCaseInsensitiveKey(match.winner) === "b") {
        groupStandings.get(playerBKey)!.points += 1;
      }
    }

    standings.set(groupId, groupStandings);
  }

  return Object.fromEntries(
    [...standings.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "en-US"))
      .map(([groupId, players]) => [
        groupId,
        [...players.values()].sort((left, right) => {
          if (right.points !== left.points) {
            return right.points - left.points;
          }
          return left.name.localeCompare(right.name, "en-US");
        }),
      ]),
  );
}
