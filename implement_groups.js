const fs = require('fs');

let file = 'app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// We need to add state and fetch logic for group standings in `app/admin/page.tsx`.
if (!content.includes('const [groupStatuses, setGroupStatuses] = useState<any[]>([]);')) {
    content = content.replace(
        'const [tournaments, setTournaments] = useState<{id: string, name: string}[]>([]);',
        'const [tournaments, setTournaments] = useState<{id: string, name: string}[]>([]);\n  const [groupStatuses, setGroupStatuses] = useState<any[]>([]);'
    );
}

const fetchGroupStatuses = `  const fetchGroupStatuses = async () => {
    if (!tournamentId) return;
    try {
      const res = await fetch(\`/api/groups/standings?tournamentId=\${tournamentId}\`);
      if (res.ok) setGroupStatuses(await res.json());
    } catch (err) {}
  };

  useEffect(() => {
    fetchGroupStatuses();
  }, [tournamentId, matches]);`;

if (!content.includes('const fetchGroupStatuses')) {
    content = content.replace(
        'const fetchTournaments = async () => {',
        fetchGroupStatuses + '\n\n  const fetchTournaments = async () => {'
    );
}

const handleConfirmGroup = `  const handleConfirmGroup = async (groupCode: string, action: "CONFIRM" | "UNCONFIRM") => {
    if (!confirm(\`⚠️ 确定要 \${action === "CONFIRM" ? "确认" : "取消确认"} 小组 \${groupCode} 吗？\`)) return;
    try {
      const res = await fetch("/api/admin/groups/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId, groupCode, action }),
      });
      if (res.ok) {
        fetchGroupStatuses();
      } else {
        const err = await res.json();
        alert("操作失败: " + err.error);
      }
    } catch (err) {
      alert("网络错误");
    }
  };`;

if (!content.includes('const handleConfirmGroup')) {
    content = content.replace(
        'const handleGenerateTop8Bracket',
        handleConfirmGroup + '\n\n  const handleGenerateTop8Bracket'
    );
}

// Now we need to render the Group Statuses UI inside Core Ops, above Active Matches.
const groupsUI = `
        {/* Group Standings & Confirmation */}
        <div className="bg-black/80 border-2 border-neutral-700 p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] mb-10 relative overflow-hidden transform -skew-x-2">
          <div className="flex justify-between items-center mb-6 transform skew-x-2">
            <h2 className="text-3xl font-bold text-white flex items-center gap-2 tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
              📊 小组排名与确认 (GROUP STANDINGS)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transform skew-x-2">
            {groupStatuses.map(group => (
              <div key={group.groupName} className="border border-neutral-700 bg-[#1a1a1a] p-4">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-2">
                  <h3 className="text-xl font-bold text-yellow-500 font-mono">{group.groupName}</h3>
                  <div className="flex items-center gap-2">
                    <span className={\`text-xs font-bold px-2 py-1 \${group.status?.isConfirmed ? "bg-green-900 text-green-400" : group.status?.isComplete ? "bg-yellow-900 text-yellow-400" : "bg-neutral-800 text-neutral-400"}\`}>
                      {group.status?.isConfirmed ? "CONFIRMED" : group.status?.isComplete ? "READY TO CONFIRM" : "IN PROGRESS"}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">{group.status?.settledMatchCount || 0}/{group.status?.scheduledMatchCount || 0} Settled</span>
                  </div>
                </div>
                <div className="space-y-1 mb-4">
                  {(group.status?.standings || group.standings).map((p: any, i: number) => (
                    <div key={p.player} className="flex justify-between text-sm font-mono text-neutral-300">
                      <span>{i + 1}. {p.player}</span>
                      <div className="flex gap-2 text-xs">
                        <span className="text-green-500">{p.wins}W</span>
                        <span className="text-red-500">{p.losses}L</span>
                        <span className="text-yellow-500">{p.points}pts</span>
                        {i < 2 && (
                          <span className={\`px-1 \${group.status?.isConfirmed ? "bg-green-900 text-green-400" : "bg-neutral-800 text-neutral-500"}\`}>
                            {group.status?.isConfirmed ? "QUALIFIED" : "PROV."}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  {group.status?.isConfirmed ? (
                    <button onClick={() => handleConfirmGroup(group.groupName.replace("Group ", ""), "UNCONFIRM")} className="text-xs px-3 py-1 bg-red-900 hover:bg-red-800 text-white font-bold transition-colors shadow-[2px_2px_0px_rgba(239,68,68,0.5)]">
                      ❌ UNCONFIRM
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConfirmGroup(group.groupName.replace("Group ", ""), "CONFIRM")}
                      disabled={!group.status?.isComplete}
                      className="text-xs px-3 py-1 bg-green-900 hover:bg-green-800 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold transition-colors shadow-[2px_2px_0px_rgba(34,197,94,0.5)] disabled:shadow-none"
                    >
                      ✅ CONFIRM GROUP
                    </button>
                  )}
                </div>
              </div>
            ))}
            {groupStatuses.length === 0 && <div className="text-neutral-500 text-sm font-mono col-span-2">Select a tournament to view group standings.</div>}
          </div>
        </div>
`;

content = content.replace(
    '{/* Active Matches Section */}',
    groupsUI + '\n        {/* Active Matches Section */}'
);

fs.writeFileSync(file, content);
