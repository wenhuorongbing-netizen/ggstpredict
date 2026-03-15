import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";

interface BracketMatchNodeProps {
  match: {
    id: string;
    playerA: string;
    playerB: string;
    charA?: string | null;
    charB?: string | null;
    scoreA?: number | null;
    scoreB?: number | null;
    status: string;
    winner?: string | null;
    roundName?: string | null;
  };
}

export default function BracketMatchNode({ match }: BracketMatchNodeProps) {
  const isSettled = match.status === "SETTLED";
  const aWins = isSettled && match.winner === "A";
  const bWins = isSettled && match.winner === "B";

  const getContainerStyles = () => {
    if (match.status === "OPEN") return "border-red-600 bg-[#1a1a1a]";
    if (match.status === "LOCKED") return "border-neutral-700 bg-[#111111] opacity-75";
    return "border-neutral-800 bg-[#1a1a1a]"; // CLOSED or SETTLED, strictly #1a1a1a as requested
  };

  const getRowStyles = (isWinner: boolean, isLoser: boolean) => {
    if (!isSettled) return "text-white";
    if (isWinner) return "text-yellow-400 font-bold border-yellow-500 bg-yellow-900/20"; // gold accent
    if (isLoser) return "text-neutral-500 opacity-50 border-transparent";
    return "text-white border-transparent";
  };

  return (
    <Link href={`/dashboard#match-${match.id}`} className="block hover:scale-105 transition-transform">
      <div className={`w-48 sm:w-56 p-1 border-2 shadow-lg overflow-hidden flex flex-col font-mono text-sm relative z-10 ${getContainerStyles()}`}>
        {/* Player A Row */}
        <div className={`flex items-center justify-between p-1 border-b-2 ${getRowStyles(aWins, bWins)}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-5 h-5 flex-shrink-0">
              <PlayerAvatar playerName={match.playerA} charName={match.charA} playerType="A" />
            </div>
            <span className="truncate">{match.playerA}</span>
          </div>
          <span className="font-black text-right ml-2">{typeof match.scoreA === 'number' ? match.scoreA : '-'}</span>
        </div>

        {/* Player B Row */}
        <div className={`flex items-center justify-between p-1 border-b-2 ${getRowStyles(bWins, aWins)}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-5 h-5 flex-shrink-0">
              <PlayerAvatar playerName={match.playerB} charName={match.charB} playerType="B" />
            </div>
            <span className="truncate">{match.playerB}</span>
          </div>
          <span className="font-black text-right ml-2">{typeof match.scoreB === 'number' ? match.scoreB : '-'}</span>
        </div>
      </div>
    </Link>
  );
}
