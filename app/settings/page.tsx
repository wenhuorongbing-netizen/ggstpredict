"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("displayName");
      if (storedName) {
        setDisplayName(storedName);
        setOriginalName(storedName);
      }
    }
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!displayName.trim() || displayName.length < 3) {
      setError("显示名称至少需要 3 个字符");
      return;
    }

    if (displayName === originalName) {
      return;
    }

    setIsUpdating(true);
    try {
      const userId = localStorage.getItem("userId");

      const res = await fetch("/api/users/name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, displayName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "更新资料失败");
      } else {
        localStorage.setItem("displayName", data.displayName);
        setOriginalName(data.displayName);
        setSuccess("显示名称已更新");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      localStorage.removeItem("displayName");
      localStorage.removeItem("points");
      localStorage.removeItem("role");
      router.push("/");
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="relative z-10 mx-auto max-w-3xl p-4 sm:p-8">
          <div className="mb-12 flex items-center justify-between border border-neutral-800 bg-[#1a1a1a] p-4 transform -skew-x-2">
            <div className="transform skew-x-2">
              <h1
                className="text-4xl font-black tracking-widest text-white drop-shadow-[2px_2px_0px_rgba(59,130,246,1)]"
                style={{ fontFamily: "var(--font-bebas)" }}
              >
                系统设置
              </h1>
              <p className="text-sm font-bold tracking-widest text-blue-500">玩家档案配置</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6 flex items-center justify-between border-2 border-red-500 bg-red-950/80 p-4 text-red-200 shadow-[4px_4px_0px_rgba(239,68,68,1)] transform -skew-x-2 animate-ggst-shake"
              >
                <span className="font-mono text-sm font-bold tracking-wide">系统错误：{error}</span>
                <button onClick={() => setError(null)} className="p-1 text-red-400 hover:text-white" aria-label="关闭错误">
                  关闭
                </button>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6 flex items-center justify-between border-2 border-green-500 bg-green-950/80 p-4 text-green-200 shadow-[4px_4px_0px_rgba(34,197,94,1)] transform -skew-x-2"
              >
                <span className="font-mono text-sm font-bold tracking-wide">{success}</span>
                <button onClick={() => setSuccess(null)} className="p-1 text-green-400 hover:text-white" aria-label="关闭通知">
                  关闭
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative mb-10 overflow-hidden border-2 border-neutral-700 bg-black/80 p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] transform -skew-x-2">
            <div className="pointer-events-none absolute right-0 top-0 z-20 h-8 w-8 border-r-4 border-t-4 border-blue-500"></div>

            <h2
              className="mb-8 flex items-center gap-2 text-3xl font-bold tracking-widest text-white transform skew-x-2"
              style={{ fontFamily: "var(--font-bebas)" }}
            >
              玩家档案
            </h2>

            <form onSubmit={handleUpdateName} className="relative z-10 flex flex-col gap-6 transform skew-x-2">
              <div className="group w-full">
                <label
                  htmlFor="displayName"
                  className="mb-2 block text-xl font-bold tracking-widest text-blue-500"
                  style={{ fontFamily: "var(--font-bebas)" }}
                >
                  显示名称
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border-2 border-neutral-700 bg-[#1a1a1a] p-4 text-2xl font-bold tracking-widest text-white transition-colors focus:border-blue-500 focus:outline-none"
                  style={{ fontFamily: "var(--font-bebas)" }}
                  required
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdating || displayName === originalName}
                  className="ggst-button w-full border-blue-500 px-8 py-3 text-xl hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                  style={{ boxShadow: "4px 4px 0px 0px rgba(59, 130, 246, 0.8)" }}
                >
                  {isUpdating ? "正在更新..." : "保存名称"}
                </button>
              </div>
            </form>
          </div>

          <div className="relative overflow-hidden border-2 border-red-900/50 bg-red-950/20 p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] transform -skew-x-2">
            <h2
              className="mb-8 flex items-center gap-2 text-3xl font-bold tracking-widest text-red-500 transform skew-x-2"
              style={{ fontFamily: "var(--font-bebas)" }}
            >
              退出登录
            </h2>

            <div className="transform skew-x-2">
              <button
                onClick={handleLogout}
                className="ggst-button flex w-full items-center justify-between border-red-600 bg-black px-8 py-4 text-2xl font-black text-red-500 hover:bg-red-700 hover:text-white"
                style={{ boxShadow: "4px 4px 0px 0px rgba(220, 38, 38, 0.8)" }}
              >
                <span>退出登录</span>
                <span className="text-4xl leading-none">→</span>
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
