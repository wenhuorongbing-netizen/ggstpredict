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
    return "border-neutral-800 bg-[#0a0a0a]"; // CLOSED or SETTLED
  };

  const getRowStyles = (isWinner: boolean, isLoser: boolean) => {
    if (!isSettled) return "text-white";
    if (isWinner) return "text-yellow-400 font-bold bg-yellow-900/20";
    if (isLoser) return "text-neutral-500 opacity-50";
    return "text-white";
  };

  return (
    <Link href={`/dashboard#match-${match.id}`} className="block hover:scale-105 transition-transform">
      <div className={`w-56 rounded border-2 shadow-lg overflow-hidden flex flex-col font-mono text-sm relative z-10 ${getContainerStyles()}`}>
        {/* Header (Optional round name or status) */}
        {match.roundName && (
          <div className="bg-neutral-900/50 text-[10px] text-center text-neutral-400 border-b border-neutral-800 py-0.5 uppercase tracking-widest">
            {match.roundName}
          </div>
        )}

        {/* Player A Row */}
        <div className={`flex items-center justify-between p-1.5 border-b border-neutral-800 ${getRowStyles(aWins, bWins)}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-6 h-6 flex-shrink-0">
              <PlayerAvatar playerName={match.playerA} charName={match.charA} playerType="A" />
            </div>
            <span className="truncate">{match.playerA}</span>
          </div>
          <span className="font-black px-2">{typeof match.scoreA === 'number' ? match.scoreA : '-'}</span>
        </div>

        {/* Player B Row */}
        <div className={`flex items-center justify-between p-1.5 ${getRowStyles(bWins, aWins)}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-6 h-6 flex-shrink-0">
              <PlayerAvatar playerName={match.playerB} charName={match.charB} playerType="B" />
            </div>
            <span className="truncate">{match.playerB}</span>
          </div>
          <span className="font-black px-2">{typeof match.scoreB === 'number' ? match.scoreB : '-'}</span>
        </div>
      </div>
    </Link>
  );
}
