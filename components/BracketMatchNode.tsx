import { Match } from "@prisma/client";
import { useRouter } from "next/navigation";

export default function BracketMatchNode({ match, isWinnersBracket }: { match: Match, isWinnersBracket: boolean }) {
  const router = useRouter();

  const isSettled = match.status === "SETTLED";
  const winnerA = isSettled && match.winner === "A";
  const winnerB = isSettled && match.winner === "B";

  const handleNodeClick = () => {
    // Navigate to dashboard and scroll to match if open/locked
    router.push(`/dashboard#match-${match.id}`);
  };

  return (
    <div
      onClick={handleNodeClick}
      className={`
        w-64 flex flex-col bg-[#1a1a1a] border-2 cursor-pointer transition-all hover:scale-[1.02] relative
        ${isWinnersBracket ? 'border-red-900/50 hover:border-red-500 shadow-[2px_2px_0px_rgba(239,68,68,0.2)]' : 'border-blue-900/50 hover:border-blue-500 shadow-[2px_2px_0px_rgba(59,130,246,0.2)]'}
      `}
    >
      {/* Status Header */}
      <div className="flex justify-between items-center px-2 py-1 bg-black/80 border-b border-neutral-800 text-[10px] font-bold tracking-widest uppercase">
        <span className="text-neutral-500 truncate mr-2" style={{ fontFamily: "var(--font-bebas)" }}>{match.roundName || "Match"}</span>
        <span className={match.status === "OPEN" ? "text-green-500" : match.status === "LOCKED" ? "text-yellow-500" : "text-neutral-600"}>
          {match.status}
        </span>
      </div>

      {/* Player A */}
      <div className={`flex justify-between items-center px-3 py-2 border-b border-neutral-800/50 ${winnerA ? 'bg-yellow-900/20' : ''} ${winnerB ? 'opacity-50 grayscale' : ''}`}>
        <div className="flex items-center gap-2 truncate">
           <div className={`w-1 h-4 ${winnerA ? 'bg-yellow-500' : 'bg-red-600'}`}></div>
           <span className={`font-bold truncate ${winnerA ? 'text-yellow-400' : 'text-white'}`}>{match.playerA}</span>
        </div>
        <span className={`font-black ml-2 ${winnerA ? 'text-yellow-400' : 'text-neutral-500'}`} style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}>
          {match.scoreA ?? "-"}
        </span>
      </div>

      {/* Player B */}
      <div className={`flex justify-between items-center px-3 py-2 ${winnerB ? 'bg-yellow-900/20' : ''} ${winnerA ? 'opacity-50 grayscale' : ''}`}>
        <div className="flex items-center gap-2 truncate">
           <div className={`w-1 h-4 ${winnerB ? 'bg-yellow-500' : 'bg-blue-600'}`}></div>
           <span className={`font-bold truncate ${winnerB ? 'text-yellow-400' : 'text-white'}`}>{match.playerB}</span>
        </div>
        <span className={`font-black ml-2 ${winnerB ? 'text-yellow-400' : 'text-neutral-500'}`} style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}>
          {match.scoreB ?? "-"}
        </span>
      </div>
    </div>
  );
}
