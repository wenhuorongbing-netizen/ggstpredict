/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("FIGHTER");
  const [points, setPoints] = useState("0");
  const [winStreak, setWinStreak] = useState("0");
  const [role, setRole] = useState("USER");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalTension, setGlobalTension] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDisplayName(localStorage.getItem("displayName") || "FIGHTER");
      setPoints(localStorage.getItem("points") || "0");
      setWinStreak(localStorage.getItem("winStreak") || "0");
      setRole(localStorage.getItem("role") || "USER");

      const fetchTension = async () => {
        try {
          const res = await fetch("/api/settings/tension");
          if (res.ok) {
            const data = await res.json();
            setGlobalTension(data.tension || 0);
          }
        } catch (e) {
          // silent
        }
      };

      fetchTension();

      // Set up a tiny interval to keep points in sync if they update elsewhere
      const interval = setInterval(() => {
        setPoints(localStorage.getItem("points") || "0");
        setWinStreak(localStorage.getItem("winStreak") || "0");
        setDisplayName(localStorage.getItem("displayName") || "FIGHTER");
        fetchTension();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, []);

  const navLinks = [
    { name: "👤 猎人档案", href: "/profile" },
    { name: "⚔️ 赛事战局", href: "/dashboard" },
    { name: "🏆 比赛赛程", href: "/bracket" },
    { name: "👑 排行榜", href: "/leaderboard" },
    { name: "⚙️ 账户设置", href: "/settings" },
    { name: "📖 用户手册", href: "/docs" },
    { name: "ℹ️ 关于 (ABOUT)", href: "/about" },
  ];

  if (role === "ADMIN") {
    navLinks.push({ name: "🚨 管理员面板", href: "/admin" });
  }

  const maxTension = 50000;
  const isTensionMaxed = globalTension >= maxTension;
  const tensionPercentage = Math.min((globalTension / maxTension) * 100, 100);

  return (
    <div className="min-h-screen bg-[#111111] bg-[linear-gradient(to_right,#333333_1px,transparent_1px),linear-gradient(to_bottom,#333333_1px,transparent_1px)] bg-[size:40px_40px] text-white font-sans selection:bg-red-500/30 overflow-hidden relative flex flex-col md:flex-row">
      <div className="absolute inset-0 bg-noise z-0 pointer-events-none"></div>

      {/* Global Tension Gauge */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-neutral-900 z-50">
        <div
          className={`h-full transition-all duration-1000 ${isTensionMaxed ? 'bg-yellow-400 animate-pulse' : 'bg-yellow-500'}`}
          style={{ width: `${tensionPercentage}%`, boxShadow: isTensionMaxed ? '0 0 10px rgba(250, 204, 21, 0.8)' : '0 0 5px rgba(234, 179, 8, 0.8)' }}
        ></div>
        {isTensionMaxed && (
          <div className="absolute top-2 w-full text-center pointer-events-none">
            <span className="bg-yellow-400 text-black text-xs font-black px-4 py-1 rounded-b shadow-[0_4px_10px_rgba(250,204,21,0.5)] transform -skew-x-6 inline-block" style={{ fontFamily: "var(--font-bebas)" }}>
              ⚡ MAX TENSION: 下局全服免税!
            </span>
          </div>
        )}
      </div>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#0a0a0a] border-b-2 border-red-600 p-4 flex justify-between items-center relative z-20 shadow-[0_4px_15px_rgba(239,68,68,0.2)]">
        <h1 className="text-2xl font-black text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
          GGST PREDICT
        </h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-red-500 font-bold"
        >
          {isMobileMenuOpen ? "CLOSE" : "MENU"}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <motion.aside
        className={`${
          isMobileMenuOpen ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-64 bg-[#0a0a0a]/95 backdrop-blur-md border-b-2 md:border-b-0 md:border-r-4 border-red-600 relative z-20 flex-shrink-0 min-h-[50vh] md:min-h-screen p-6 shadow-[4px_0_15px_rgba(239,68,68,0.15)]`}
        initial={false}
        animate={{ x: 0 }}
      >
        <div className="hidden md:block mb-12">
          <h1 className="text-4xl font-black text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)] transform -skew-x-2" style={{ fontFamily: "var(--font-bebas)" }}>
            HEAVEN <br/> OR HELL
          </h1>
        </div>

        <nav className="flex-1 flex flex-col gap-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block py-3 px-4 text-lg font-bold tracking-widest transition-all transform -skew-x-2 ${
                  isActive
                    ? "bg-red-600 text-white shadow-[4px_4px_0px_rgba(239,68,68,0.5)] translate-x-2"
                    : "text-neutral-400 border border-transparent hover:border-red-500 hover:text-red-400 hover:bg-[#1a1a1a]"
                }`}
                style={{ fontFamily: "var(--font-bebas)" }}
              >
                <span className="inline-block transform skew-x-2">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8 border-t-2 border-neutral-800 flex flex-col gap-2 transform -skew-x-2">
          <div className="text-xs text-neutral-500 font-bold tracking-widest">当前玩家 (ACTIVE FIGHTER):</div>
          <div className="text-xl text-white font-black truncate">{displayName}</div>
          <div className="text-sm font-mono font-bold text-yellow-500 flex items-center gap-2">
            <span>₩ {Number(points).toLocaleString()}</span>
            {Number(winStreak) > 0 && <span className="ml-2 bg-red-600/20 px-2 py-0.5 rounded text-red-400">🔥 x{winStreak} 连胜</span>}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 h-screen overflow-y-auto">
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
