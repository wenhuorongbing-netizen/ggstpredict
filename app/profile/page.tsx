"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import PlayerAvatar from "@/components/PlayerAvatar";

interface MatchSummary {
  id: string;
  playerA: string;
  playerB: string;
  charA?: string | null;
  charB?: string | null;
  status: string;
  winner?: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
  poolA: number;
  poolB: number;
}

interface BetRecord {
  id: string;
  amount: number;
  betOn: "A" | "B";
  betOnName: string;
  createdAt: string;
  usedFdShield: boolean;
  usedFatalCounter: boolean;
  predictedScoreA?: number | null;
  predictedScoreB?: number | null;
  usedItems: string[];
  fatalHit: boolean;
  fdSavedStreak: boolean;
  profit: number;
  resultLabel: string;
  match: MatchSummary;
}

interface PurchaseRecord {
  id: string;
  item: string;
  itemName: string;
  shortName: string;
  icon: string;
  accent: "red" | "gold" | "blue" | "violet";
  cost: number;
  status: string;
  details: Record<string, string | number | boolean | null> | null;
  summary: string;
  usageHint?: string | null;
  visibilityHint?: string | null;
  createdAt: string;
}

interface HistoryRecord {
  id: string;
  kind: "purchase" | "bet";
  createdAt: string;
  title: string;
  summary: string;
  amountLabel: string;
  accent: "red" | "gold" | "blue" | "violet";
  icon: string;
  details: {
    usedItems?: string[];
    fdSavedStreak?: boolean;
    fatalHit?: boolean;
    [key: string]: unknown;
  } | null;
}

interface UserProfile {
  id: string;
  displayName: string;
  nameColor: string;
  points: number;
  winStreak: number;
  fdShields: number;
  fatalCounters: number;
  robbieHexes: number;
  activeMegaphones: number;
  purchases: PurchaseRecord[];
  bets: BetRecord[];
  history: HistoryRecord[];
}

const accentClasses: Record<HistoryRecord["accent"], string> = {
  red: "border-red-600/60 bg-red-950/30 text-red-100",
  gold: "border-[#c7a128]/60 bg-[#2c240e] text-[#f4df96]",
  blue: "border-[#4e68b8]/60 bg-[#131a30] text-[#dbe4ff]",
  violet: "border-violet-500/60 bg-violet-950/30 text-violet-100",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) {
          setError("未登录");
          return;
        }

        const res = await fetch("/api/users/profile", {
          headers: {
            "x-user-id": userId,
          },
          cache: "no-store",
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "读取个人资料失败");
        }

        setProfile(data.user);
      } catch (err) {
        console.error("Failed to fetch profile", err);
        setError(err instanceof Error ? err.message : "读取个人资料失败");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex h-full items-center justify-center px-6">
            <div className="border border-[#2b3038] bg-[#101318] px-6 py-4 text-sm tracking-[0.28em] text-[#9fa3aa]">
              资料加载中...
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (!profile) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex h-full items-center justify-center px-6">
            <div className="border border-red-700/60 bg-[#180c0f] px-6 py-4 text-sm tracking-[0.2em] text-[#f0ece3]">
              {error ?? "读取个人资料失败"}
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const inventoryCards = [
    {
      key: "fd",
      label: "FD 护盾",
      count: profile.fdShields,
      hint: "下注时可保住连胜。",
      accent: "text-[#f4df96]",
    },
    {
      key: "fatal",
      label: "致命打康",
      count: profile.fatalCounters,
      hint: "下注时可追加比分预测。",
      accent: "text-red-300",
    },
    {
      key: "robbie",
      label: "罗比印记",
      count: profile.robbieHexes,
      hint: "已贴在赛程选手头像上的标签数。",
      accent: "text-violet-200",
    },
    {
      key: "megaphone",
      label: "在飞扩音器",
      count: profile.activeMegaphones,
      hint: "仍在首页顶部滚动的横幅数。",
      accent: "text-blue-200",
    },
  ];

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <section className="border border-[#2b3038] bg-[#0f131a] px-5 py-5 shadow-[10px_10px_0px_rgba(0,0,0,0.32)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="h-24 w-24 shrink-0">
                  <PlayerAvatar playerName={profile.displayName} playerType="A" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.26em] text-[#9fa3aa]">个人资料 / 操作记录</div>
                  <h1
                    className="mt-2 text-4xl font-black uppercase tracking-[0.08em]"
                    style={{
                      fontFamily: "var(--font-bebas)",
                      color: profile.nameColor || "#f0ece3",
                    }}
                  >
                    {profile.displayName}
                  </h1>
                  <div className="mt-2 text-xs tracking-[0.18em] text-[#6f747c]">
                    HUNTER ID · {profile.id}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="border border-[#2b3038] bg-[#141922] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#9fa3aa]">余额</div>
                  <div className="mt-2 text-3xl font-black text-[#f4df96]" style={{ fontFamily: "var(--font-bebas)" }}>
                    {profile.points.toLocaleString()} W$
                  </div>
                </div>
                <div className="border border-[#2b3038] bg-[#141922] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#9fa3aa]">连胜</div>
                  <div className="mt-2 text-3xl font-black text-[#f0ece3]" style={{ fontFamily: "var(--font-bebas)" }}>
                    {profile.winStreak}
                  </div>
                </div>
                <div className="border border-[#2b3038] bg-[#141922] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#9fa3aa]">下注记录</div>
                  <div className="mt-2 text-3xl font-black text-[#f0ece3]" style={{ fontFamily: "var(--font-bebas)" }}>
                    {profile.bets.length}
                  </div>
                </div>
                <div className="border border-[#2b3038] bg-[#141922] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#9fa3aa]">黑市操作</div>
                  <div className="mt-2 text-3xl font-black text-[#f0ece3]" style={{ fontFamily: "var(--font-bebas)" }}>
                    {profile.purchases.length}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="space-y-6">
              <section className="border border-[#2b3038] bg-[#0f131a]">
                <div className="border-b border-[#232831] bg-[#11161e] px-4 py-3">
                  <h2 className="text-2xl font-black tracking-[0.08em] text-[#f0ece3]" style={{ fontFamily: "var(--font-bebas)" }}>
                    道具库存
                  </h2>
                </div>
                <div className="grid gap-3 p-4">
                  {inventoryCards.map((card) => (
                    <div key={card.key} className="border border-[#262b34] bg-[#161b23] px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-[#f0ece3]">{card.label}</div>
                          <div className="mt-1 text-xs leading-5 text-[#9fa3aa]">{card.hint}</div>
                        </div>
                        <div className={`text-3xl font-black ${card.accent}`} style={{ fontFamily: "var(--font-bebas)" }}>
                          {card.count}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border border-[#2b3038] bg-[#0f131a]">
                <div className="border-b border-[#232831] bg-[#11161e] px-4 py-3">
                  <h2 className="text-2xl font-black tracking-[0.08em] text-[#f0ece3]" style={{ fontFamily: "var(--font-bebas)" }}>
                    黑市购入
                  </h2>
                </div>
                <div className="space-y-3 p-4">
                  {profile.purchases.length === 0 ? (
                    <div className="border border-dashed border-[#2b3038] bg-[#131820] px-4 py-3 text-sm text-[#9fa3aa]">
                      暂无黑市记录。
                    </div>
                  ) : (
                    profile.purchases.slice(0, 6).map((purchase) => (
                      <div key={purchase.id} className="border border-[#262b34] bg-[#161b23] px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">{purchase.icon}</div>
                            <div>
                              <div className="text-sm font-semibold text-[#f0ece3]">{purchase.itemName}</div>
                              <div className="mt-1 text-xs leading-5 text-[#9fa3aa]">{purchase.summary}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-[#f4df96]" style={{ fontFamily: "var(--font-bebas)" }}>
                              -{purchase.cost} W$
                            </div>
                            <div className="mt-1 text-[11px] text-[#6f747c]">{formatDateTime(purchase.createdAt)}</div>
                          </div>
                        </div>
                        {(purchase.usageHint || purchase.visibilityHint) && (
                          <div className="mt-3 space-y-1 text-[11px] leading-5 text-[#9fa3aa]">
                            {purchase.usageHint && <div>使用：{purchase.usageHint}</div>}
                            {purchase.visibilityHint && <div>显示：{purchase.visibilityHint}</div>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="border border-[#2b3038] bg-[#0f131a]">
                <div className="border-b border-[#232831] bg-[#11161e] px-4 py-3">
                  <h2 className="text-2xl font-black tracking-[0.08em] text-[#f0ece3]" style={{ fontFamily: "var(--font-bebas)" }}>
                    操作历史
                  </h2>
                </div>
                <div className="space-y-3 p-4">
                  {profile.history.length === 0 ? (
                    <div className="border border-dashed border-[#2b3038] bg-[#131820] px-4 py-3 text-sm text-[#9fa3aa]">
                      还没有任何操作记录。
                    </div>
                  ) : (
                    profile.history.map((entry) => (
                      <article key={entry.id} className="border border-[#262b34] bg-[#151921] px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-xl">{entry.icon}</div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-[#f0ece3]">{entry.title}</h3>
                                <span className={`border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${accentClasses[entry.accent]}`}>
                                  {entry.kind === "purchase" ? "黑市" : "下注"}
                                </span>
                              </div>
                              <div className="mt-1 text-sm text-[#c8c1b5]">{entry.summary}</div>
                              {entry.details?.usedItems && entry.details.usedItems.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {entry.details.usedItems.map((item) => (
                                    <span
                                      key={item}
                                      className="border border-[#3b404a] bg-[#1b2028] px-2 py-1 text-[11px] text-[#f0ece3]"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                  {entry.details.fdSavedStreak && (
                                    <span className="border border-[#c7a128]/50 bg-[#2a220d] px-2 py-1 text-[11px] text-[#f4df96]">
                                      失败后保住连胜
                                    </span>
                                  )}
                                  {entry.details.fatalHit && (
                                    <span className="border border-red-500/50 bg-[#2a1012] px-2 py-1 text-[11px] text-red-200">
                                      打康命中 +50%
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-sm font-black text-[#f0ece3]" style={{ fontFamily: "var(--font-bebas)" }}>
                              {entry.amountLabel}
                            </div>
                            <div className="mt-1 text-[11px] text-[#6f747c]">{formatDateTime(entry.createdAt)}</div>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="border border-[#2b3038] bg-[#0f131a]">
                <div className="border-b border-[#232831] bg-[#11161e] px-4 py-3">
                  <h2 className="text-2xl font-black tracking-[0.08em] text-[#f0ece3]" style={{ fontFamily: "var(--font-bebas)" }}>
                    下注明细
                  </h2>
                </div>
                <div className="space-y-3 p-4">
                  {profile.bets.length === 0 ? (
                    <div className="border border-dashed border-[#2b3038] bg-[#131820] px-4 py-3 text-sm text-[#9fa3aa]">
                      还没有下注记录。
                    </div>
                  ) : (
                    profile.bets.map((bet) => (
                      <article key={bet.id} className="border border-[#262b34] bg-[#151921] px-4 py-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-[#f0ece3]">
                              {bet.match.playerA} vs {bet.match.playerB}
                            </div>
                            <div className="mt-1 text-xs text-[#9fa3aa]">
                              押注 {bet.betOnName} · {bet.amount.toLocaleString()} W$ · {formatDateTime(bet.createdAt)}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {bet.usedItems.length > 0 ? (
                                bet.usedItems.map((item) => (
                                  <span
                                    key={item}
                                    className="border border-[#3b404a] bg-[#1b2028] px-2 py-1 text-[11px] text-[#f0ece3]"
                                  >
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="border border-[#31353d] bg-[#171b22] px-2 py-1 text-[11px] text-[#9fa3aa]">
                                  未使用道具
                                </span>
                              )}
                              {bet.fdSavedStreak && (
                                <span className="border border-[#c7a128]/50 bg-[#2a220d] px-2 py-1 text-[11px] text-[#f4df96]">
                                  FD 已保住连胜
                                </span>
                              )}
                              {bet.fatalHit && (
                                <span className="border border-red-500/50 bg-[#2a1012] px-2 py-1 text-[11px] text-red-200">
                                  打康命中
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-[#f0ece3]" style={{ fontFamily: "var(--font-bebas)" }}>
                              {bet.resultLabel}
                            </div>
                            {bet.match.scoreA !== null && bet.match.scoreB !== null && (
                              <div className="mt-1 text-[11px] text-[#9fa3aa]">
                                结算比分 {bet.match.scoreA} - {bet.match.scoreB}
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
