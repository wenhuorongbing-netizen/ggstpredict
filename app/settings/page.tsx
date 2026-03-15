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
      setError("FIGHTER NAME MUST BE AT LEAST 3 CHARACTERS");
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
        setError(data.error || "FAILED TO UPDATE PROFILE");
      } else {
        localStorage.setItem("displayName", data.displayName);
        setOriginalName(data.displayName);
        setSuccess("PROFILE UPDATED SUCCESSFULLY");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("NETWORK ERROR. TRY AGAIN.");
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
        <div className="max-w-3xl mx-auto relative z-10 p-4 sm:p-8">

          {/* Header */}
          <div className="flex justify-between items-center mb-12 transform -skew-x-2 bg-[#1a1a1a] border border-neutral-800 p-4">
            <div className="transform skew-x-2">
              <h1 className="text-4xl font-black text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(59,130,246,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                SYSTEM SETTINGS
              </h1>
              <p className="text-blue-500 text-sm tracking-widest font-bold uppercase">玩家档案配置</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-950/80 border-2 border-red-500 text-red-200 p-4 mb-6 flex justify-between items-center shadow-[4px_4px_0px_rgba(239,68,68,1)] transform -skew-x-2 animate-ggst-shake"
              >
                <span className="font-mono text-sm tracking-wide font-bold">系统错误 (ERROR): {error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-white p-1">✕</button>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-green-950/80 border-2 border-green-500 text-green-200 p-4 mb-6 flex justify-between items-center shadow-[4px_4px_0px_rgba(34,197,94,1)] transform -skew-x-2"
              >
                <span className="font-mono text-sm tracking-wide font-bold">{success}</span>
                <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-white p-1">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile Module */}
          <div className="bg-black/80 border-2 border-neutral-700 p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] mb-10 relative overflow-hidden transform -skew-x-2">
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 pointer-events-none z-20"></div>

            <h2 className="text-3xl font-bold mb-8 text-white flex items-center gap-2 transform skew-x-2 tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
               玩家档案 (DOSSIER)
            </h2>

            <form onSubmit={handleUpdateName} className="flex flex-col gap-6 relative z-10 transform skew-x-2">
              <div className="w-full group">
                <label htmlFor="displayName" className="block text-xl text-blue-500 mb-2 font-bold tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>玩家昵称 (R-CODE)</label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#1a1a1a] border-2 border-neutral-700 p-4 text-white text-2xl focus:outline-none focus:border-blue-500 transition-colors font-bold tracking-widest"
                  style={{ fontFamily: "var(--font-bebas)" }}
                  required
                />
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  disabled={isUpdating || displayName === originalName}
                  className="ggst-button border-blue-500 hover:bg-blue-600 px-8 py-3 text-xl disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                  style={{ boxShadow: "4px 4px 0px 0px rgba(59, 130, 246, 0.8)" }}
                >
                  {isUpdating ? "正在更新..." : "保存昵称"}
                </button>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-950/20 border-2 border-red-900/50 p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] relative overflow-hidden transform -skew-x-2">
            <h2 className="text-3xl font-bold mb-8 text-red-500 flex items-center gap-2 transform skew-x-2 tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>
               系统终端 (TERMINAL)
            </h2>

            <div className="transform skew-x-2">
              <p className="text-neutral-400 mb-6 font-mono text-sm border-l-2 border-red-500 pl-4 py-2 bg-red-950/20">
                警告：终止连接将清除当前会话，您需要重新登录才能继续。
              </p>

              <button
                onClick={handleLogout}
                className="ggst-button w-full border-red-600 hover:bg-red-700 hover:text-white px-8 py-4 text-2xl font-black bg-black text-red-500 flex items-center justify-between"
                style={{ boxShadow: "4px 4px 0px 0px rgba(220, 38, 38, 0.8)" }}
              >
                <span>退出登录 (LOGOUT)</span>
                <span className="text-4xl leading-none">⚠️</span>
              </button>
            </div>
          </div>

        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
