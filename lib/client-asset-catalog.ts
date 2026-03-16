"use client";

import { buildLooseKey } from "@/lib/tournament-data";
import type { AssetCatalog } from "@/lib/asset-catalog";

export const EMPTY_CLIENT_ASSET_CATALOG: AssetCatalog = {
  players: { urls: {}, choices: [] },
  characters: { urls: {}, choices: [] },
};

let catalogPromise: Promise<AssetCatalog> | null = null;

export async function loadAssetCatalog() {
  if (typeof window === "undefined") {
    return EMPTY_CLIENT_ASSET_CATALOG;
  }

  if (!catalogPromise) {
    catalogPromise = fetch("/api/assets/catalog", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "force-cache",
    })
      .then(async (response) => {
        if (!response.ok) {
          return EMPTY_CLIENT_ASSET_CATALOG;
        }

        return (await response.json()) as AssetCatalog;
      })
      .catch(() => EMPTY_CLIENT_ASSET_CATALOG);
  }

  return catalogPromise;
}

export function resolveAssetUrl(index: Record<string, string>, value?: string | null) {
  const key = buildLooseKey(value);
  if (!key) {
    return null;
  }

  return index[key] ?? null;
}
