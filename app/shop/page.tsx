"use client";

import { useState, useEffect } from "react";
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
    id: "ITEM_FD",
    name: "绝对防御 (FD Shield)",
    cost: 100,
    description: "购买后可获得一层护盾，未来使用可抵消一次预测失败的扣分。",
    icon: "🛡️",
  },
  {
    id: "ITEM_FATAL",
    name: "致命打康 (Fatal Counter)",
    cost: 300,
    description: "购买后获得打康标记，未来使用可让某场比赛的收益翻倍。",
    icon: "⚡",
  },
  {
    id: "ITEM_HEX",
    name: "紫色的罗比印记 (Robbie's Hex)",
    cost: 1500,
    description: "顶级的社交嘲讽。购买后给当前赛事的指定选手贴上永久的耻辱/毒奶印记，全服可见！",
    icon: "☠️",
  },
  {
    id: "ITEM_MEGAPHONE",
    name: "高频扩音器 (Salt Megaphone)",
    cost: 100,
    description: "廉价的弹幕骑脸工具。输入一段垃圾话，在首页大厅顶部强制滚动播放 120 分钟！",
    icon: "📣",
  }
];

export default function ShopPage() {
  const router = useRouter();
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Real-time user stats
  const [points, setPoints] = useState<number>(0);
  const [fdShields, setFdShields] = useState<number>(0);
  const [fatalCounters, setFatalCounters] = useState<number>(0);

  // Fetch stats when opening the shop
  const fetchUserStats = async () => {
    if (typeof window === "undefined") return;
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setPoints(data.points || 0);
        setFdShields(data.fdShields || 0);
        setFatalCounters(data.fatalCounters || 0);
      }
    } catch (e) {
      console.error("Failed to fetch user stats", e);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  const handlePurchase = async (item: ShopItem) => {
    setError(null);
    setSuccessMsg(null);

    if (points < item.cost) {
      setError("余额不足，无法购买 (INSUFFICIENT FUNDS)");
      return;
    }

    let targetPlayer: string | null = null;
    let megaphoneText: string | null = null;

    if (item.id === "ITEM_HEX") {
      targetPlayer = window.prompt("👾请输入你要制裁的选手名字 (注意拼写)：\n\n这将在他/她每场比赛的头像上留下永久印记！");
      if (!targetPlayer) return;
    } else if (item.id === "ITEM_MEGAPHONE") {
      megaphoneText = window.prompt("📣请输入你要发送的全服广播 (最多50个字符)：\n\n这条信息将在大厅顶部滚动播放120分钟！");
      if (!megaphoneText) return;
      if (megaphoneText.length > 50) {
        setError("全服广播文本不能超过50个字符");
        return;
      }
    } else {
      if (!confirm(`⚠️ 危险交易：确定要花费 ${item.cost} 积分购买 [ ${item.name} ] 吗？`)) {
        return;
      }
    }

    setIsPurchasing(item.id);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setError("User not authenticated.");
        setIsPurchasing(null);
        return;
      }

      const payload: any = { item: item.id };
      if (targetPlayer) {
        payload.targetPlayer = targetPlayer;
      }
      if (megaphoneText) {
        payload.text = megaphoneText;
      }

      const res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "购买失败");
      } else {
        setSuccessMsg(`✅ 交易成功！获得了 [ ${item.name} ]。`);
        // Update local state instantly with API response
        setPoints(data.points);
        setFdShields(data.fdShields);
        setFatalCounters(data.fatalCounters);

        // Also trigger a layout update by setting localStorage
        window.dispatchEvent(new Event("storage"));
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

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 relative z-10 transform skew-x-2 gap-4">
            <div>
              <h1 className="text-4xl font-black text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                THE BLACK MARKET
              </h1>
              <p className="text-red-500 font-bold uppercase tracking-widest text-sm">
                地下交易终端 (Bounty Sinks)
              </p>
            </div>

            <div className="flex gap-4 bg-black/80 border-2 border-neutral-700 p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] transform -skew-x-2 w-full sm:w-auto">
              <div className="flex flex-col border-r border-neutral-800 pr-4">
                <span className="text-[10px] text-neutral-500 font-bold tracking-widest">W$ 余额 (FUNDS)</span>
                <span className="text-xl font-black text-yellow-400 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" style={{ fontFamily: "var(--font-bebas)" }}>{points.toLocaleString()}</span>
              </div>
              <div className="flex flex-col border-r border-neutral-800 pr-4">
                <span className="text-[10px] text-blue-500 font-bold tracking-widest">🛡️ FD 护盾</span>
                <span className="text-xl font-black text-white" style={{ fontFamily: "var(--font-bebas)" }}>x{fdShields}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-red-500 font-bold tracking-widest">⚡ 致命打康</span>
                <span className="text-xl font-black text-white" style={{ fontFamily: "var(--font-bebas)" }}>x{fatalCounters}</span>
              </div>
            </div>
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
            * 购买道具后会立即加入您的个人资产中，供之后下注使用。
          </div>

        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}