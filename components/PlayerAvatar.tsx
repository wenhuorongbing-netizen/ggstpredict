"use client";

import { useEffect, useState } from "react";
import { buildLooseKey } from "@/lib/tournament-data";
import { EMPTY_CLIENT_ASSET_CATALOG, loadAssetCatalog, resolveAssetUrl } from "@/lib/client-asset-catalog";

interface PlayerAvatarProps {
  playerName: string;
  charName?: string | null;
  playerType: "A" | "B";
}

export default function PlayerAvatar({ playerName, charName, playerType }: PlayerAvatarProps) {
  const [catalog, setCatalog] = useState(EMPTY_CLIENT_ASSET_CATALOG);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [errorState, setErrorState] = useState<{ key: string; tier: 1 | 2 | 3 }>({
    key: "",
    tier: 1,
  });

  useEffect(() => {
    let cancelled = false;

    loadAssetCatalog().then((result) => {
      if (cancelled) {
        return;
      }

      setCatalog(result);
      setCatalogLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const playerUrl = resolveAssetUrl(catalog.players.urls, playerName) ?? `/assets/players/${buildLooseKey(playerName)}.png`;
  const charUrl = charName
    ? resolveAssetUrl(catalog.characters.urls, charName) ?? `/assets/characters/${buildLooseKey(charName)}.png`
    : null;
  const avatarKey = `${playerUrl}::${charUrl ?? ""}`;
  const tier = errorState.key === avatarKey ? errorState.tier : 1;

  const getStyles = () => {
    if (playerType === "A") {
      return "bg-gradient-to-br from-red-600 to-red-900 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    }
    return "bg-gradient-to-bl from-blue-600 to-blue-900 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]";
  };

  const handleErrorTier1 = () => {
    if (charName) {
      setErrorState({ key: avatarKey, tier: 2 });
    } else {
      setErrorState({ key: avatarKey, tier: 3 });
    }
  };

  const handleErrorTier2 = () => {
    setErrorState({ key: avatarKey, tier: 3 });
  };

  return (
    <div className={`relative flex items-center justify-center overflow-hidden shrink-0 aspect-square rounded-md bg-neutral-800 border-2 ${getStyles()}`}>
      {tier === 1 && (
        <img
          src={playerUrl}
          alt={playerName}
          className="w-full h-full object-cover absolute inset-0"
          onError={handleErrorTier1}
        />
      )}
      {tier === 2 && charName && (
        <img
          src={charUrl ?? undefined}
          alt={charName}
          className="w-full h-full object-cover absolute inset-0"
          onError={handleErrorTier2}
        />
      )}
      {tier === 3 && (
        <div className="w-full h-full flex items-center justify-center absolute inset-0">
          <span className="text-2xl font-bold text-white drop-shadow-md leading-none" style={{ fontFamily: "var(--font-bebas)" }}>
            {playerName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      {!catalogLoaded && tier === 3 && (
        <div className="absolute inset-0 bg-neutral-800/60" />
      )}
    </div>
  );
}
