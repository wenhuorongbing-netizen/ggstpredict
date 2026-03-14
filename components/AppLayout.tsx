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
  const [role, setRole] = useState("USER");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDisplayName(localStorage.getItem("displayName") || "FIGHTER");
      setPoints(localStorage.getItem("points") || "0");
      setRole(localStorage.getItem("role") || "USER");

      // Set up a tiny interval to keep points in sync if they update elsewhere
      const interval = setInterval(() => {
        setPoints(localStorage.getItem("points") || "0");
        setDisplayName(localStorage.getItem("displayName") || "FIGHTER");
      }, 2000);
      return () => clearInterval(interval);
    }
  }, []);

  const navLinks = [
    { name: "⚔️ 赛事战局", href: "/dashboard" },
    { name: "🏆 比赛赛程", href: "/bracket" },
    { name: "👑 排行榜", href: "/leaderboard" },
    { name: "⚙️ 账户设置", href: "/settings" },
    { name: "📖 用户手册", href: "/docs" },
  ];

  if (role === "ADMIN") {
    navLinks.push({ name: "🚨 管理员面板", href: "/admin" });
  }

  return (
    <div className="min-h-screen bg-[#111111] bg-[linear-gradient(to_right,#333333_1px,transparent_1px),linear-gradient(to_bottom,#333333_1px,transparent_1px)] bg-[size:40px_40px] text-white font-sans selection:bg-red-500/30 overflow-hidden relative flex flex-col md:flex-row">
      <div className="absolute inset-0 bg-noise z-0 pointer-events-none"></div>

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
