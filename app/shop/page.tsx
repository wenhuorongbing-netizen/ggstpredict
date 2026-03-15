"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { useRouter } from "next/navigation";

interface ShopItem {
  id: string;
  name: string;
  cost: number;
  description: string;
  icon: string;
}

const ITEMS: ShopItem[] = [
  {
    id: "discord_role",
    name: "Discord 专属称号 (Custom Role)",
    cost: 5000,
    description: "在官方 Discord 频道获得自定义颜色的专属头衔。",
    icon: "🎭",
  },
  {
    id: "sponsor_match",
    name: "下一场奖池注资 (Sponsor a Match)",
    cost: 2000,
    description: "Admin 将你的 2000 W$ 注入下一场对决的随机奖池。",
    icon: "💉",
  },
  {
    id: "request_match",
    name: "指定赛事开盘 (Request a Match)",
    cost: 1000,
    description: "向统帅 (Admin) 申请开盘一场你指定的特定比赛。",
    icon: "🎟️",
  },
];

export default function ShopPage() {
  const router = useRouter();
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePurchase = async (item: ShopItem) => {
    setError(null);
    setSuccessMsg(null);

    if (!confirm(`⚠️ 危险交易：确定要花费 ${item.cost} 积分购买 [ ${item.name} ] 吗？`)) {
      return;
    }

    setIsPurchasing(item.id);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setError("User not authenticated.");
        setIsPurchasing(null);
        return;
      }
      const res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({ item: item.name, cost: item.cost }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "购买失败");
      } else {
        setSuccessMsg(`✅ 交易成功！[ ${item.name} ] 订单已提交给统帅。`);
        // We do not fetch user points here; the AppLayout interval will catch it.
      }
    } catch (err) {
      setError("网络中断，黑市交易失败");
    } finally {
      setIsPurchasing(null);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-5xl mx-auto p-4 sm:p-8 relative">

          <div className="flex justify-between items-center mb-8 relative z-10 transform skew-x-2">
            <h1 className="text-4xl font-black text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
              THE BLACK MARKET
            </h1>
            <p className="text-red-500 font-bold uppercase tracking-widest text-sm">
              地下交易终端 (Bounty Sinks)
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6 relative z-10 transform -skew-x-2"
              >
                <div className="bg-red-950/80 border-2 border-red-500 text-red-200 p-4 flex items-center justify-between shadow-[4px_4px_0px_rgba(239,68,68,1)] animate-ggst-shake">
                  <span className="font-bold tracking-widest flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}>⚠️ {error}</span>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-white">✕</button>
                </div>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6 relative z-10 transform -skew-x-2"
              >
                <div className="bg-green-950/80 border-2 border-green-500 text-green-200 p-4 flex items-center justify-between shadow-[4px_4px_0px_rgba(34,197,94,1)] animate-pulse">
                  <span className="font-bold tracking-widest flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}>📦 {successMsg}</span>
                  <button onClick={() => setSuccessMsg(null)} className="text-green-400 hover:text-white">✕</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 w-full transform -skew-x-2">
            {ITEMS.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02, y: -5 }}
                className="bg-black/80 border-2 border-neutral-700 p-6 flex flex-col justify-between shadow-[8px_8px_0px_rgba(0,0,0,0.5)] hover:border-red-500/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-neutral-600 group-hover:border-red-500 pointer-events-none transition-colors"></div>

                <div className="transform skew-x-2">
                  <div className="text-5xl mb-4 drop-shadow-[2px_2px_0px_rgba(239,68,68,0.5)]">
                    {item.icon}
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2 leading-tight" style={{ fontFamily: "var(--font-bebas)" }}>
                    {item.name}
                  </h3>
                  <p className="text-sm text-neutral-400 font-medium mb-6 min-h-[60px]">
                    {item.description}
                  </p>
                </div>

                <div className="transform skew-x-2 mt-auto pt-4 border-t border-neutral-800">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-red-500 font-bold tracking-widest">COST:</span>
                    <span className="text-2xl font-black text-yellow-500 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                      W$ {item.cost.toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={isPurchasing === item.id}
                    className="w-full py-3 ggst-button border-red-500 hover:bg-red-600 focus-visible:outline-none"
                    style={{ boxShadow: "4px 4px 0px 0px rgba(239, 68, 68, 0.8)", fontSize: "1.2rem" }}
                  >
                    {isPurchasing === item.id ? "PROCESSING..." : "[ 购买 (PURCHASE) ]"}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-[#0a0a0a] border border-neutral-800 border-dashed text-neutral-500 text-sm font-mono relative z-10 transform skew-x-2">
            * 所有的黑市交易均为人工 (Admin) 处理。购买后，订单状态将变更为 PENDING，统帅会在处理完成后标记为 FULFILLED。
          </div>

        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}