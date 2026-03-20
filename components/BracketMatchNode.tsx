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

  const isTBDA = match.playerA === "[ TBD ]";
  const isTBDB = match.playerB === "[ TBD ]";

  return (
    <div
      onClick={handleNodeClick}
      className={`
        w-full sm:w-72 md:w-80 flex flex-col bg-[#0a0a0a] border-2 cursor-pointer transition-all hover:scale-[1.02] relative transform -skew-x-2 clip-chamfer
        ${isWinnersBracket ? 'border-red-900/80 hover:border-red-500 shadow-[4px_4px_0px_rgba(239,68,68,0.3)]' : 'border-blue-900/80 hover:border-blue-500 shadow-[4px_4px_0px_rgba(59,130,246,0.3)]'}
      `}
    >
      {/* Status Header */}
      <div className={`flex justify-between items-center px-3 py-1.5 border-b-2 border-neutral-800 text-xs font-bold tracking-widest uppercase transform skew-x-2 ${match.status === "SETTLED" ? 'bg-neutral-900' : 'bg-black'}`}>
        <span className="text-neutral-500 truncate mr-2" style={{ fontFamily: "var(--font-bebas)" }}>{match.roundName || "Match"}</span>
        <span className={match.status === "OPEN" ? "text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)] animate-pulse" : match.status === "LOCKED" ? "text-yellow-500" : "text-neutral-600"}>
          {match.status}
        </span>
      </div>

      <div className="transform skew-x-2 relative">
        {/* Player A */}
        <div className={`flex justify-between items-center px-3 py-2.5 border-b-2 border-neutral-800/50 ${winnerA ? 'bg-yellow-900/20' : ''} ${winnerB ? 'opacity-40 grayscale' : ''}`}>
          <div className="flex items-center gap-3 truncate w-full">
            <div className={`w-1.5 h-6 ${isTBDA ? 'bg-neutral-800' : winnerA ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,1)]' : 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]'}`}></div>
            <span className={`font-bold truncate text-[15px] ${isTBDA ? 'text-neutral-600 font-mono tracking-widest' : winnerA ? 'text-yellow-400 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]' : 'text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]'}`}>
              {match.playerA}
            </span>
          </div>
          <span className={`font-black ml-3 tracking-wider ${isTBDA ? 'opacity-0' : winnerA ? 'text-yellow-400 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]' : 'text-neutral-500'}`} style={{ fontFamily: "var(--font-bebas)", fontSize: "1.3rem" }}>
            {match.scoreA ?? "-"}
          </span>
        </div>

        {/* Player B */}
        <div className={`flex justify-between items-center px-3 py-2.5 ${winnerB ? 'bg-yellow-900/20' : ''} ${winnerA ? 'opacity-40 grayscale' : ''}`}>
          <div className="flex items-center gap-3 truncate w-full">
            <div className={`w-1.5 h-6 ${isTBDB ? 'bg-neutral-800' : winnerB ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,1)]' : 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]'}`}></div>
            <span className={`font-bold truncate text-[15px] ${isTBDB ? 'text-neutral-600 font-mono tracking-widest' : winnerB ? 'text-yellow-400 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]' : 'text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]'}`}>
              {match.playerB}
            </span>
          </div>
          <span className={`font-black ml-3 tracking-wider ${isTBDB ? 'opacity-0' : winnerB ? 'text-yellow-400 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]' : 'text-neutral-500'}`} style={{ fontFamily: "var(--font-bebas)", fontSize: "1.3rem" }}>
            {match.scoreB ?? "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
