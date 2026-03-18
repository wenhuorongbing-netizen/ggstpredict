import { useEffect, useState } from "react";
import { GroupStandings as GroupStandingsType } from "@/lib/standings";

export default function GroupStandings() {
  const [standings, setStandings] = useState<GroupStandingsType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const fetchStandings = async () => {
    try {
      const res = await fetch("/api/standings");
      if (!res.ok) throw new Error("Failed to fetch standings");
      const data = await res.json();
      setStandings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStandings();
    const interval = setInterval(fetchStandings, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="text-yellow-500 font-bold font-mono animate-pulse">LOADING STANDINGS...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 font-mono text-center p-4">
        ERROR: {error}
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <div className="text-center py-20 bg-black/50 border-2 border-neutral-800 border-dashed mx-4 transform -skew-x-2">
         <p className="text-neutral-500 font-bold text-2xl tracking-widest">等待小组赛数据 (NO GROUP MATCHES FOUND)</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {standings.map((group) => {
        const isExpanded = expandedGroups[group.groupName] || false;
        return (
          <div key={group.groupName} className="flex flex-col w-full">
            <div className="bg-neutral-900 border-l-4 border-[#0055FF] shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden w-full">
              <div className="bg-neutral-800 flex justify-between items-center border-b border-neutral-700">
                <div className="bg-[#0055FF] text-white font-black tracking-widest px-6 py-2 transform -skew-x-6 inline-block ml-[-10px] my-2 shadow-[2px_0_0_rgba(255,255,255,0.2)]">
                  <span className="transform skew-x-6 inline-block">{group.groupName}</span>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 text-xs sm:text-sm font-mono tracking-wider bg-black/50">
                      <th className="py-3 px-2 sm:px-4 font-medium w-8 text-center">#</th>
                      <th className="py-3 px-2 sm:px-4 font-medium w-2/5">PLAYER</th>
                      <th className="py-3 px-2 sm:px-4 font-medium text-center" title="Match Wins - Match Losses">M W-L</th>
                      <th className="py-3 px-2 sm:px-4 font-medium text-center" title="Game Wins - Game Losses">G W-L</th>
                      <th className="py-3 px-2 sm:px-4 font-medium text-center text-yellow-500" title="Game Difference">DIFF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.standings.map((player, index) => {
                      // Top 2 advancing, bottom eliminated (grayed out)
                      const isTop2 = index < 2;
                      const isBottom = index >= group.standings.length - 1 && group.standings.length > 2;

                      let rowStyle = "border-b border-neutral-800/50 hover:bg-neutral-800/50 transition-colors";
                      let nameStyle = "font-bold text-white truncate";
                      let rankStyle = "text-neutral-500 font-mono";

                      if (isTop2) {
                        rowStyle += " bg-[#39FF14]/5";
                        nameStyle = "font-black text-[#39FF14] drop-shadow-[0_0_5px_rgba(57,255,20,0.5)] truncate";
                        rankStyle = "text-[#39FF14] font-bold font-mono";
                      } else if (isBottom) {
                        rowStyle += " opacity-50";
                        nameStyle = "font-medium text-neutral-400 truncate";
                      }

                      return (
                        <tr key={player.playerName} className={rowStyle}>
                          <td className="py-3 px-2 sm:px-4 text-center">
                            <span className={rankStyle}>{index + 1}.</span>
                          </td>
                          <td className="py-3 px-2 sm:px-4">
                            <div className={nameStyle}>{player.playerName}</div>
                          </td>
                          <td className="py-3 px-2 sm:px-4 text-center text-neutral-300 font-mono text-sm sm:text-base">
                            {player.matchWins}-{player.matchLosses}
                          </td>
                          <td className="py-3 px-2 sm:px-4 text-center text-neutral-400 font-mono text-sm sm:text-base">
                            {player.gameWins}-{player.gameLosses}
                          </td>
                          <td className="py-3 px-2 sm:px-4 text-center text-yellow-500 font-bold font-mono text-sm sm:text-base">
                            {player.gameDiff > 0 ? `+${player.gameDiff}` : player.gameDiff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Foldable Match Panel */}
            <div className="w-full transform -skew-x-2 mt-1 px-2">
              <button
                onClick={() => toggleGroup(group.groupName)}
                className="w-full bg-neutral-900/80 hover:bg-neutral-800 border-2 border-neutral-800 border-t-0 flex items-center justify-center py-2 text-neutral-400 hover:text-white transition-colors text-xs font-bold tracking-widest gap-2"
              >
                {isExpanded ? (
                  <>HIDE MATCHES ▲</>
                ) : (
                  <>VIEW {group.matches.length} MATCHES ▼</>
                )}
              </button>

              {isExpanded && (
                <div className="bg-black/90 border-2 border-neutral-800 border-t-0 p-4 transform skew-x-2 flex flex-col gap-2">
                  {group.matches.length === 0 ? (
                    <div className="text-center text-neutral-500 text-sm py-2">NO MATCHES</div>
                  ) : (
                    group.matches.map((m: any) => (
                      <div key={m.id || m.playerA+m.playerB} className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-2 text-sm">
                        <div className={`flex-1 text-right ${m.winner === 'A' ? 'text-yellow-500 font-bold' : 'text-neutral-400'}`}>
                          {m.playerA}
                        </div>
                        <div className="px-4 font-mono font-bold bg-black text-white border border-neutral-700 mx-2">
                          {m.scoreA ?? '-'} : {m.scoreB ?? '-'}
                        </div>
                        <div className={`flex-1 text-left ${m.winner === 'B' ? 'text-yellow-500 font-bold' : 'text-neutral-400'}`}>
                          {m.playerB}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
