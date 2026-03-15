"use client";

import { useState } from "react";

interface PlayerAvatarProps {
  playerName: string;
  charName?: string | null;
  playerType: "A" | "B";
}

export default function PlayerAvatar({ playerName, charName, playerType }: PlayerAvatarProps) {
  const [tier, setTier] = useState<1 | 2 | 3>(1);

  const sanitize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

  const getStyles = () => {
    if (playerType === "A") {
      return "bg-gradient-to-br from-red-600 to-red-900 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    }
    return "bg-gradient-to-bl from-blue-600 to-blue-900 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]";
  };

  const handleErrorTier1 = () => {
    if (charName) {
      setTier(2);
    } else {
      setTier(3);
    }
  };

  const handleErrorTier2 = () => {
    setTier(3);
  };

  return (
    <div className={`relative flex items-center justify-center overflow-hidden shrink-0 aspect-square rounded-full border-2 ${getStyles()}`}>
      {tier === 1 && (
        <img
          src={`/assets/players/${sanitize(playerName)}.png`}
          alt={playerName}
          className="w-full h-full object-cover absolute inset-0"
          onError={handleErrorTier1}
        />
      )}
      {tier === 2 && charName && (
        <img
          src={`/assets/characters/${sanitize(charName)}.png`}
          alt={charName}
          className="w-full h-full object-cover absolute inset-0"
          onError={handleErrorTier2}
        />
      )}
      {tier === 3 && (
        <span className="text-2xl font-bold text-white drop-shadow-md leading-none absolute" style={{ fontFamily: "var(--font-bebas)" }}>
          {playerName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
