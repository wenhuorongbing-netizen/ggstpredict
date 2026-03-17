"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import {
  getHoldingCount,
  type InventorySnapshot,
  type ShopItemDefinition,
} from "@/lib/shop-catalog";
import { invalidateLoungeStateCache } from "@/lib/client-lounge-state";

interface ShopStateResponse {
  items: ShopItemDefinition[];
  inventory: InventorySnapshot & {
    points: number;
  };
  currentPlayers: string[];
}

const accentMap: Record<ShopItemDefinition["accent"], string> = {
  red: "border-red-600/70 bg-[#221114] text-red-100 shadow-[0_16px_30px_rgba(213,16,30,0.18)]",
  gold: "border-[#c7a128]/70 bg-[#221b0f] text-[#f4df96] shadow-[0_16px_30px_rgba(199,161,40,0.16)]",
  blue: "border-[#4e68b8]/60 bg-[#111827] text-[#dbe4ff] shadow-[0_16px_30px_rgba(78,104,184,0.14)]",
  violet: "border-violet-500/60 bg-[#1c1024] text-violet-100 shadow-[0_16px_30px_rgba(132,71,194,0.18)]",
};

const badgeMap: Record<ShopItemDefinition["accent"], string> = {
  red: "border-red-500/40 bg-red-950/50 text-red-100",
  gold: "border-[#c7a128]/40 bg-[#32270c] text-[#f4df96]",
  blue: "border-[#4e68b8]/40 bg-[#151d33] text-[#dbe4ff]",
  violet: "border-violet-500/40 bg-violet-950/50 text-violet-100",
};

export default function ShopPage() {
  const [shopState, setShopState] = useState<ShopStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hexTarget, setHexTarget] = useState("");
  const [megaphoneMessage, setMegaphoneMessage] = useState("");

  const fetchShopState = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setLoading(false);
      return;
    }

    const response = await fetch("/api/shop/state", {
      headers: {
        "x-user-id": userId,
      },
      cache: "no-store",
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "无法读取黑市状态");
    }

    setShopState(data);
    localStorage.setItem("points", String(data.inventory.points));
  };

  useEffect(() => {
    fetchShopState()
      .catch((loadError) => {
        console.error(loadError);
        setError(loadError instanceof Error ? loadError.message : "无法读取黑市状态");
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (item: ShopItemDefinition) => {
    setError(null);
    setSuccessMsg(null);

    const userId = localStorage.getItem("userId");
    if (!userId) {
      setError("请先登录");
      return;
    }

    const payload: Record<string, unknown> = {
      itemId: item.id,
    };

    if (item.requiresTarget) {
      payload.targetPlayer = hexTarget;
    }

    if (item.requiresMessage) {
      payload.message = megaphoneMessage;
    }

    setIsPurchasing(item.id);
    try {
      const response = await fetch("/api/shop/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "购买失败");
        return;
      }

      invalidateLoungeStateCache();
      await fetchShopState();

      if (item.id === "robbie_hex") {
        setHexTarget("");
      }
      if (item.id === "salt_megaphone") {
        setMegaphoneMessage("");
      }

      setSuccessMsg(`${item.name} 已到账。`);
    } catch (purchaseError) {
      console.error(purchaseError);
      setError("黑市交易失败，请稍后再试");
    } finally {
      setIsPurchasing(null);
    }
  };

  const totalHoldings = useMemo(() => {
    if (!shopState) {
      return 0;
    }

    return shopState.inventory.fdShields + shopState.inventory.fatalCounters + shopState.inventory.activeMegaphones;
  }, [shopState]);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-6xl p-4 sm:p-8">
          <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="border border-[#272c34] bg-[#101216] px-5 py-5 shadow-[0_18px_28px_rgba(0,0,0,0.24)]">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">黑市补给</div>
              <h1 className="mt-2 text-4xl font-black tracking-[0.12em] text-[#f1ede4]" style={{ fontFamily: "var(--font-bebas)" }}>
                BLACK MARKET
              </h1>
            </div>

            <div className="border border-[#272c34] bg-[#12151a] px-5 py-5">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a909a]">账户快照</div>
              <div className="mt-4 grid gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[#8a909a]">余额</div>
                  <div className="mt-1 text-3xl font-black text-[#f1ede4]" style={{ fontFamily: "var(--font-bebas)" }}>
                    {shopState?.inventory.points.toLocaleString() ?? "--"} W$
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="border border-[#272c34] bg-[#181c22] px-3 py-3">
                    <div className="text-xs text-[#8a909a]">FD</div>
                    <div className="mt-1 text-xl font-black text-[#f1ede4]" style={{ fontFamily: "var(--font-bebas)" }}>
                      {shopState?.inventory.fdShields ?? 0}
                    </div>
                  </div>
                  <div className="border border-[#272c34] bg-[#181c22] px-3 py-3">
                    <div className="text-xs text-[#8a909a]">打康</div>
                    <div className="mt-1 text-xl font-black text-[#f1ede4]" style={{ fontFamily: "var(--font-bebas)" }}>
                      {shopState?.inventory.fatalCounters ?? 0}
                    </div>
                  </div>
                  <div className="border border-[#272c34] bg-[#181c22] px-3 py-3">
                    <div className="text-xs text-[#8a909a]">在飞</div>
                    <div className="mt-1 text-xl font-black text-[#f1ede4]" style={{ fontFamily: "var(--font-bebas)" }}>
                      {shopState?.inventory.activeMegaphones ?? 0}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-[#8a909a]">当前已持有 {totalHoldings} 个即时道具。</div>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key={`error-${error}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-5 border border-red-600/60 bg-red-950/70 px-4 py-3 text-sm text-red-100"
              >
                {error}
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                key={`success-${successMsg}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-5 border border-emerald-500/60 bg-emerald-950/70 px-4 py-3 text-sm text-emerald-100"
              >
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="border border-[#272c34] bg-[#101216] px-5 py-12 text-center text-sm text-[#8a909a]">
              黑市加载中...
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {shopState?.items.map((item) => {
                const holdingCount = shopState ? getHoldingCount(shopState.inventory, item.id) : 0;
                const accentClass = accentMap[item.accent];
                const badgeClass = badgeMap[item.accent];

                return (
                  <motion.section
                    key={item.id}
                    whileHover={{ y: -3 }}
                    className={`border p-5 ${accentClass}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="flex h-14 w-14 items-center justify-center border border-white/10 bg-black/30 text-3xl">
                          {item.icon}
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.22em] text-[#8a909a]">即时道具</div>
                          <h2 className="mt-1 text-3xl font-black text-[#f1ede4]" style={{ fontFamily: "var(--font-bebas)" }}>
                            {item.name}
                          </h2>
                          <p className="mt-2 max-w-[34rem] text-sm leading-6 text-[#cfc7bb]">{item.description}</p>
                        </div>
                      </div>
                      <div className={`shrink-0 border px-3 py-2 text-right ${badgeClass}`}>
                        <div className="text-[10px] uppercase tracking-[0.2em]">{item.holdLabel}</div>
                        <div className="mt-1 text-2xl font-black" style={{ fontFamily: "var(--font-bebas)" }}>
                          x{holdingCount}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_9rem]">
                      <div className="space-y-4">
                        <div className="rounded border border-[#272c34] bg-black/30 px-4 py-3 text-sm leading-6 text-[#b5aea3]">
                          {item.flavor}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="border border-[#272c34] bg-[#171b21] px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-[#8a909a]">使用时机</div>
                            <div className="mt-2 text-sm leading-6 text-[#f1ede4]">{item.usageHint}</div>
                          </div>
                          <div className="border border-[#272c34] bg-[#171b21] px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-[#8a909a]">公开显示</div>
                            <div className="mt-2 text-sm leading-6 text-[#f1ede4]">{item.visibilityHint}</div>
                          </div>
                        </div>

                        {item.requiresTarget && (
                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#8a909a]">
                              罗比目标
                            </label>
                            <select
                              value={hexTarget}
                              onChange={(event) => setHexTarget(event.target.value)}
                              className="w-full border border-[#414754] bg-[#171a20] px-4 py-3 text-sm text-[#f1ede4] outline-none transition focus:border-violet-400"
                            >
                              <option value="">选择当前赛程选手</option>
                              {shopState.currentPlayers.map((player) => (
                                <option key={player} value={player}>
                                  {player}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {item.requiresMessage && (
                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#8a909a]">
                              扩音内容
                            </label>
                            <textarea
                              value={megaphoneMessage}
                              onChange={(event) => setMegaphoneMessage(event.target.value)}
                              maxLength={80}
                              rows={3}
                              placeholder="例如：今晚 Sol 必须倒在这里。"
                              className="w-full resize-none border border-[#414754] bg-[#171a20] px-4 py-3 text-sm text-[#f1ede4] outline-none transition placeholder:text-[#8a909a] focus:border-blue-400"
                            />
                            <div className="mt-2 text-right text-xs text-[#8a909a]">
                              {megaphoneMessage.length} / 80
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-between gap-4">
                        <div className="border border-[#272c34] bg-black/30 px-4 py-4 text-center">
                          <div className="text-[10px] uppercase tracking-[0.22em] text-[#8a909a]">售价</div>
                          <div className="mt-2 text-4xl font-black text-[#f1ede4]" style={{ fontFamily: "var(--font-bebas)" }}>
                            {item.cost}
                          </div>
                          <div className="text-xs text-[#be9b33]">W$</div>
                        </div>

                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={isPurchasing === item.id}
                          className="border border-red-500 bg-[#15181e] px-4 py-4 text-base font-black tracking-[0.12em] text-[#f1ede4] transition hover:bg-[#1e232c] disabled:cursor-not-allowed disabled:border-neutral-700 disabled:text-[#656b75]"
                          style={{ fontFamily: "var(--font-bebas)" }}
                        >
                          {isPurchasing === item.id ? "处理中" : "立即购买"}
                        </button>
                      </div>
                    </div>
                  </motion.section>
                );
              })}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
