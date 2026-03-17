"use client";

<<<<<<< Updated upstream
import { useState } from "react";
=======
import { useEffect, useState } from "react";
import { buildLooseKey } from "@/lib/tournament-data";
import { EMPTY_CLIENT_ASSET_CATALOG, loadAssetCatalog, resolveAssetUrl } from "@/lib/client-asset-catalog";
import { loadLoungeState } from "@/lib/client-lounge-state";
>>>>>>> Stashed changes

interface PlayerAvatarProps {
  playerName: string;
  charName?: string | null;
  playerType: "A" | "B";
  showCharBadge?: boolean;
}

<<<<<<< Updated upstream
export default function PlayerAvatar({ playerName, charName, playerType }: PlayerAvatarProps) {
  const [tier, setTier] = useState<1 | 2 | 3>(1);

  const sanitize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
=======
export default function PlayerAvatar({ playerName, charName, playerType, showCharBadge = true }: PlayerAvatarProps) {
  const [catalog, setCatalog] = useState(EMPTY_CLIENT_ASSET_CATALOG);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [isRobbieHexed, setIsRobbieHexed] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    loadLoungeState().then((result) => {
      if (cancelled) {
        return;
      }

      const playerKey = buildLooseKey(playerName);
      setIsRobbieHexed(result.robbieHexes.some((entry) => buildLooseKey(entry) === playerKey));
    });

    return () => {
      cancelled = true;
    };
  }, [playerName]);

  const playerUrl = resolveAssetUrl(catalog.players.urls, playerName) ?? `/assets/players/${buildLooseKey(playerName)}.png`;
  const charUrl = charName
    ? resolveAssetUrl(catalog.characters.urls, charName) ?? `/assets/characters/${buildLooseKey(charName)}.png`
    : null;
  const avatarKey = `${playerUrl}::${charUrl ?? ""}`;
  const tier = errorState.key === avatarKey ? errorState.tier : 1;
  const charBadge = charName
    ? charName
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, 4)
        .toUpperCase()
    : null;
  const fallbackMark = (() => {
    const trimmed = playerName.trim();
    const cjkChars = Array.from(trimmed.matchAll(/[\u3400-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/gu), (match) => match[0]);
    if (cjkChars.length >= 2) {
      return `${cjkChars[0]}${cjkChars[1]}`;
    }
    if (cjkChars.length === 1) {
      return cjkChars[0];
    }

    const words = trimmed
      .split(/[\s._-]+/)
      .map((part) => part.replace(/[^A-Za-z0-9]/g, ""))
      .filter(Boolean);

    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    const compact = trimmed.replace(/[^A-Za-z0-9]/g, "");
    if (compact.length >= 2) {
      const first = compact[0];
      const last = compact[compact.length - 1];
      return `${first}${last === first && compact.length > 1 ? compact[1] : last}`.toUpperCase();
    }

    if (compact.length === 1) {
      return compact.toUpperCase();
    }

    return trimmed.charAt(0).toUpperCase() || "?";
  })();
  const showFallbackBadge = showCharBadge && charBadge && tier !== 3;
>>>>>>> Stashed changes

  const getStyles = () => {
    if (playerType === "A") {
      return "bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),linear-gradient(180deg,#12070A,#060709)] border-[#d5101e] shadow-[0_0_0_1px_rgba(213,16,30,0.18),0_0_14px_rgba(213,16,30,0.12)]";
    }

    return "bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),linear-gradient(180deg,#0f1218,#060709)] border-[#4e68b8] shadow-[0_0_0_1px_rgba(78,104,184,0.18),0_0_12px_rgba(78,104,184,0.1)]";
  };

  const handleErrorTier1 = () => {
    if (charName) {
<<<<<<< Updated upstream
      setTier(2);
    } else {
      setTier(3);
=======
      setErrorState({ key: avatarKey, tier: 2 });
      return;
>>>>>>> Stashed changes
    }

    setErrorState({ key: avatarKey, tier: 3 });
  };

  const handleErrorTier2 = () => {
    setTier(3);
  };

  return (
    <div className={`ggst-player-avatar relative flex items-center justify-center overflow-hidden shrink-0 aspect-square rounded-[18px] border-2 ${getStyles()}`}>
      {isRobbieHexed && (
        <span className="ggst-player-avatar__hex absolute right-1 top-1 z-20 rounded-sm border border-violet-300/70 bg-violet-700 px-2 py-0.5 text-[10px] font-black tracking-[0.12em] text-white shadow-[0_6px_14px_rgba(88,28,135,0.45)]">
          ROBBIE!
        </span>
      )}

      {showFallbackBadge && charBadge && (
        <span className="ggst-player-avatar__char-badge absolute bottom-1 right-1 z-20 rounded-sm border border-black/70 bg-black/85 px-1.5 py-0.5 text-[10px] font-black tracking-[0.16em] text-[#ece7da] shadow-[2px_2px_0_rgba(0,0,0,0.72)]">
          {charBadge}
        </span>
      )}

      {tier === 1 && (
        <img
          src={`/assets/players/${sanitize(playerName)}.png`}
          alt={playerName}
          className="absolute inset-0 h-full w-full object-contain p-1"
          onError={handleErrorTier1}
        />
      )}

      {tier === 2 && charName && (
        <img
          src={`/assets/characters/${sanitize(charName)}.png`}
          alt={charName}
          className="absolute inset-0 h-full w-full object-contain p-1"
          onError={handleErrorTier2}
        />
      )}

      {tier === 3 && (
        <div
          className={`ggst-player-avatar__fallback ggst-player-avatar__fallback--${playerType.toLowerCase()} absolute inset-0 flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_34%),linear-gradient(180deg,rgba(11,13,18,0.2),rgba(4,5,6,0.88))]`}
        >
          <div className="ggst-player-avatar__fallback-frame absolute inset-[10%] border border-[#f0ece3]/15 opacity-70 [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)]" />
          <div className="ggst-player-avatar__fallback-emblem absolute inset-[22%] border border-[#c7a128]/18 opacity-45 [clip-path:polygon(18px_0,100%_0,100%_calc(100%-18px),calc(100%-18px)_100%,0_100%,0_18px)]" />
          <div className="ggst-player-avatar__fallback-rail absolute inset-x-2 top-2 h-1 bg-black/75" />
          <div className="ggst-player-avatar__fallback-base absolute inset-x-3 bottom-3 h-3 border border-[#f0ece3]/10 bg-black/60" />
          <span
            className={`ggst-player-avatar__fallback-mark ${fallbackMark.length >= 2 ? "ggst-player-avatar__fallback-mark--pair" : ""} text-[2.1rem] font-bold text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.9)] leading-none`}
            style={{ fontFamily: "var(--font-bebas)" }}
          >
            {fallbackMark}
          </span>
        </div>
      )}
<<<<<<< Updated upstream
=======

      {!catalogLoaded && tier === 3 && <div className="absolute inset-0 bg-neutral-800/60" />}
>>>>>>> Stashed changes
    </div>
  );
}
