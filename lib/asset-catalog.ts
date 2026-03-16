import { readdirSync } from "node:fs";
import path from "node:path";
import { buildLooseKey, normalizeCharacterName, normalizePlayerName } from "@/lib/tournament-data";

export interface AssetChoice {
  label: string;
  url: string;
}

export interface AssetGroupCatalog {
  urls: Record<string, string>;
  choices: AssetChoice[];
}

export interface AssetCatalog {
  players: AssetGroupCatalog;
  characters: AssetGroupCatalog;
}

export interface AssetFileEntry {
  name: string;
  basename: string;
  extension: string;
  url: string;
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const JPG_EXTENSIONS = new Set([".jpg", ".jpeg"]);

export const EMPTY_ASSET_CATALOG: AssetCatalog = {
  players: { urls: {}, choices: [] },
  characters: { urls: {}, choices: [] },
};

function isSupportedImageFile(filename: string) {
  return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

function getAssetUrl(publicFolder: string, filename: string) {
  return `${publicFolder}/${encodeURIComponent(filename)}`;
}

function listAssetFiles(rootDir: string, publicFolder: string): AssetFileEntry[] {
  try {
    return readdirSync(rootDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && isSupportedImageFile(entry.name))
      .map((entry) => ({
        name: entry.name,
        basename: path.parse(entry.name).name,
        extension: path.extname(entry.name).toLowerCase(),
        url: getAssetUrl(publicFolder, entry.name),
      }));
  } catch {
    return [];
  }
}

function compareAssetEntries(left: AssetFileEntry, right: AssetFileEntry) {
  const leftJpgWeight = JPG_EXTENSIONS.has(left.extension) ? 0 : 1;
  const rightJpgWeight = JPG_EXTENSIONS.has(right.extension) ? 0 : 1;

  if (leftJpgWeight !== rightJpgWeight) {
    return leftJpgWeight - rightJpgWeight;
  }

  const nameCompare = left.basename.localeCompare(right.basename, "en-US", { sensitivity: "base" });
  if (nameCompare !== 0) {
    return nameCompare;
  }

  return left.name.localeCompare(right.name, "en-US");
}

function buildAssetGroup(
  files: readonly AssetFileEntry[],
  normalizeLabel: (value: string) => string | null,
): AssetGroupCatalog {
  const urls: Record<string, string> = {};
  const choices: AssetChoice[] = [];
  const labels = new Set<string>();

  for (const file of [...files].sort(compareAssetEntries)) {
    const normalizedLabel = normalizeLabel(file.basename);
    if (!normalizedLabel) {
      continue;
    }

    const key = buildLooseKey(normalizedLabel);
    if (!key) {
      continue;
    }

    if (!urls[key]) {
      urls[key] = file.url;
    }

    if (!labels.has(key)) {
      labels.add(key);
      choices.push({
        label: normalizedLabel,
        url: file.url,
      });
    }
  }

  return {
    urls,
    choices,
  };
}

export function buildAssetCatalogFromFiles(
  playerFiles: readonly AssetFileEntry[],
  characterFiles: readonly AssetFileEntry[],
): AssetCatalog {
  return {
    players: buildAssetGroup(playerFiles, (value) => normalizePlayerName(value) || null),
    characters: buildAssetGroup(characterFiles, (value) => normalizeCharacterName(value)),
  };
}

export function getAssetCatalog(projectRoot: string): AssetCatalog {
  const publicDir = path.join(projectRoot, "public");
  const playersDir = path.join(publicDir, "assets", "players");
  const charactersDir = path.join(publicDir, "assets", "characters");

  return buildAssetCatalogFromFiles(
    listAssetFiles(playersDir, "/assets/players"),
    listAssetFiles(charactersDir, "/assets/characters"),
  );
}
