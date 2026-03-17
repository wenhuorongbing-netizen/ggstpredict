/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { loadLoungeState, type LoungeMegaphone } from "@/lib/client-lounge-state";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("\u6597\u58eb");
  const [points, setPoints] = useState("0");
  const [winStreak, setWinStreak] = useState("0");
  const [role, setRole] = useState("USER");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalTension, setGlobalTension] = useState(0);
  const [megaphones, setMegaphones] = useState<LoungeMegaphone[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDisplayName(localStorage.getItem("displayName") || "\u6597\u58eb");
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
        } catch {
          // silent
        }
      };

      const fetchLounge = async (force = false) => {
        const data = await loadLoungeState(force);
        setMegaphones(data.megaphones);
      };

      fetchTension();
      fetchLounge(true);

      const interval = setInterval(() => {
        setPoints(localStorage.getItem("points") || "0");
        setWinStreak(localStorage.getItem("winStreak") || "0");
        setDisplayName(localStorage.getItem("displayName") || "\u6597\u58eb");
        fetchTension();
        fetchLounge(true);
      }, 15000);

      return () => clearInterval(interval);
    }
  }, []);

  const navLinks = [
    { icon: "ID", name: "\u4e2a\u4eba\u8d44\u6599", href: "/profile" },
    { icon: "VS", name: "\u4e0b\u6ce8", href: "/dashboard" },
    { icon: "BR", name: "\u8d5b\u7a0b", href: "/bracket" },
    { icon: "TOP", name: "\u60ac\u8d4f\u699c\u5355", href: "/leaderboard" },
    { icon: "BK", name: "\u5546\u5e97", href: "/shop" },
    { icon: "SYS", name: "\u8bbe\u7f6e", href: "/settings" },
    { icon: "DOC", name: "\u6587\u6863", href: "/docs" },
    { icon: "INF", name: "\u5173\u4e8e", href: "/about" },
  ];

  if (role === "ADMIN") {
    navLinks.push({ icon: "ADM", name: "\u7ba1\u7406", href: "/admin" });
  }

  const maxTension = 20000;
  const isTensionMaxed = globalTension >= maxTension;
  const tensionPercentage = Math.min((globalTension / maxTension) * 100, 100);

  return (
    <div className="ggst-app-shell min-h-screen text-white font-sans selection:bg-red-500/30 overflow-hidden relative flex flex-col md:flex-row">
      <div className="absolute inset-0 bg-noise z-0 pointer-events-none" />

      <div className="absolute top-0 left-0 right-0 h-2 bg-neutral-900 z-50">
        <div
          className={`h-full transition-all duration-1000 ${isTensionMaxed ? "bg-yellow-400 animate-pulse" : "bg-yellow-500"}`}
          style={{
            width: `${tensionPercentage}%`,
            boxShadow: isTensionMaxed ? "0 0 10px rgba(250, 204, 21, 0.8)" : "0 0 5px rgba(234, 179, 8, 0.8)",
          }}
        />
        {isTensionMaxed && (
          <div className="absolute top-2 w-full text-center pointer-events-none">
            <span
              className="bg-yellow-400 text-black text-xs font-black px-4 py-1 rounded-b shadow-[0_4px_10px_rgba(250,204,21,0.5)] transform -skew-x-6 inline-block"
              style={{ fontFamily: "var(--font-bebas)" }}
            >
              {"\u5f20\u529b\u5df2\u6ee1\uff1a\u7ba1\u7406\u5458\u7279\u6548\u5f85\u547d"}
            </span>
          </div>
        )}
      </div>

      <div className="ggst-mobile-shell md:hidden bg-[#0a0a0a] border-b-2 border-red-600 p-4 flex justify-between items-center relative z-20 shadow-[0_4px_15px_rgba(239,68,68,0.2)]">
        <h1
          className="text-2xl font-black text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]"
          style={{ fontFamily: "var(--font-bebas)" }}
        >
          GGST PREDICT
        </h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="ggst-mobile-shell__toggle text-red-500 font-bold">
          {isMobileMenuOpen ? "\u5173\u95ed" : "\u83dc\u5355"}
        </button>
      </div>

      <motion.aside
        className={`ggst-sidebar ${isMobileMenuOpen ? "flex" : "hidden"} md:flex flex-col w-full md:w-64 relative z-20 flex-shrink-0 min-h-[50vh] md:min-h-screen p-5`}
        initial={false}
        animate={{ x: 0 }}
      >
        <div className="ggst-sidebar__brand hidden md:block mb-10">
          <h1
            className="text-[3.15rem] font-black text-white tracking-[0.08em] transform -skew-x-2 leading-[0.82]"
            style={{ fontFamily: "var(--font-bebas)" }}
          >
            HEAVEN <br /> OR HELL
          </h1>
        </div>

        <nav className="ggst-sidebar__nav flex-1 flex flex-col gap-3">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`ggst-sidebar__link block transition-all transform -skew-x-2 ${
                  isActive
                    ? "ggst-sidebar__link--active translate-x-2"
                    : "ggst-sidebar__link--idle"
                }`}
                style={{ fontFamily: "var(--font-bebas)" }}
              >
                <span className="ggst-sidebar__link-inner inline-flex items-center gap-3 transform skew-x-2">
                  <span className="ggst-sidebar__icon">{link.icon}</span>
                  <span className="ggst-sidebar__text">{link.name}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="ggst-sidebar__player-card mt-auto transform -skew-x-2">
          <div className="ggst-sidebar__player-kicker">{"\u7528\u6237\u540d\u5b57"}</div>
          <div className="ggst-sidebar__player-name truncate">{displayName}</div>
          <div className="ggst-sidebar__player-meta">
            <span className="ggst-sidebar__player-points">W$ {Number(points).toLocaleString()}</span>
            {Number(winStreak) > 0 && (
              <span className="ggst-sidebar__player-streak">
                {"\u8fde\u80dc"} x{winStreak}
              </span>
            )}
          </div>
        </div>
      </motion.aside>

      <main className="ggst-app-main flex-1 relative z-10 h-screen overflow-y-auto">
        {megaphones.length > 0 && (
          <div className="ggst-megaphone-strip">
            <div className="ggst-megaphone-strip__track">
              {[...megaphones, ...megaphones].map((entry, index) => (
                <div key={`${entry.id}-${index}`} className="ggst-megaphone-chip">
                  <span className="ggst-megaphone-chip__icon">MSG</span>
                  <span className="ggst-megaphone-chip__user" style={{ color: entry.user.nameColor || "#f1ede4" }}>
                    {entry.user.displayName}
                  </span>
                  <span className="ggst-megaphone-chip__message">{entry.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="w-full">{children}</div>
      </main>
      <style jsx global>{`
        .ggst-sidebar {
          border-right: 3px solid rgba(213, 16, 30, 0.92);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
            linear-gradient(180deg, #080a0e, #040506 82%);
          box-shadow:
            inset -1px 0 0 rgba(255, 255, 255, 0.03),
            8px 0 0 #000000;
        }

        .ggst-sidebar__brand {
          position: relative;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(213, 16, 30, 0.18);
        }

        .ggst-sidebar__brand::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -1px;
          width: 5.1rem;
          height: 3px;
          background: linear-gradient(90deg, #d5101e, #ff2a2a);
        }

        .ggst-sidebar__nav {
          position: relative;
        }

        .ggst-sidebar__nav::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 -0.35rem;
          width: 2px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
        }

        .ggst-sidebar__link {
          position: relative;
          min-height: 2.7rem;
          padding: 0.52rem 0.72rem;
          border: 1px solid transparent;
          color: #f0ece3;
          overflow: hidden;
        }

        .ggst-sidebar__link::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 3px;
          background: transparent;
        }

        .ggst-sidebar__link--idle {
          border-color: rgba(42, 47, 56, 0.94);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0)),
            linear-gradient(180deg, #0f1218, #080a0e);
          box-shadow: 4px 4px 0 #000000;
        }

        .ggst-sidebar__link--idle::before {
          background: linear-gradient(180deg, rgba(199, 161, 40, 0.28), rgba(255, 255, 255, 0.02));
        }

        .ggst-sidebar__link--idle:hover {
          border-color: rgba(213, 16, 30, 0.44);
          color: #f0ece3;
        }

        .ggst-sidebar__link--active {
          border-color: rgba(213, 16, 30, 0.96);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0)),
            linear-gradient(180deg, #ff2a2a, #d5101e 46%, #8b0c14 100%);
          color: #fff8f2;
          box-shadow:
            5px 5px 0 #000000,
            inset 0 0 0 1px rgba(255, 255, 255, 0.08);
          clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 0 0);
        }

        .ggst-sidebar__link--active::before {
          background: linear-gradient(180deg, #f5e4a9, #c7a128);
        }

        .ggst-sidebar__link-inner {
          width: 100%;
        }

        .ggst-sidebar__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.15rem;
          height: 1.15rem;
          border: 1px solid rgba(50, 56, 66, 0.95);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.014), rgba(255, 255, 255, 0)),
            #090b10;
          color: #f0ece3;
          font-size: 0.54rem;
          letter-spacing: 0.14em;
          box-shadow: 2px 2px 0 #000000;
        }

        .ggst-sidebar__link--active .ggst-sidebar__icon {
          border-color: rgba(255, 245, 235, 0.18);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0)),
            rgba(0, 0, 0, 0.34);
        }

        .ggst-sidebar__text {
          font-size: 1.04rem;
          letter-spacing: 0.06em;
        }

        .ggst-sidebar__player-card {
          padding: 0.72rem 0.82rem 0.78rem;
          border: 1px solid rgba(49, 54, 63, 0.94);
          border-left: 4px solid #c7a128;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
            linear-gradient(180deg, #101318, #07090d);
          box-shadow:
            6px 6px 0 #000000,
            inset 0 0 0 1px rgba(255, 255, 255, 0.02);
        }

        .ggst-sidebar__player-kicker {
          font-family: var(--font-geist-mono);
          font-size: 0.54rem;
          letter-spacing: 0.22em;
          color: #9a8c66;
          text-transform: uppercase;
        }

        .ggst-sidebar__player-name {
          margin-top: 0.32rem;
          font-family: var(--font-bebas);
          font-size: 1.78rem;
          line-height: 0.95;
          letter-spacing: 0.04em;
          color: #f0ece3;
          text-shadow: 2px 2px 0 #000000;
        }

        .ggst-sidebar__player-meta {
          display: flex;
          align-items: center;
          gap: 0.42rem;
          margin-top: 0.42rem;
          flex-wrap: wrap;
        }

        .ggst-sidebar__player-points {
          font-family: var(--font-bebas);
          font-size: 1rem;
          letter-spacing: 0.08em;
          color: #d5b24d;
        }

        .ggst-sidebar__player-streak {
          display: inline-flex;
          align-items: center;
          padding: 0.08rem 0.34rem;
          border: 1px solid rgba(213, 16, 30, 0.44);
          background: rgba(58, 11, 16, 0.94);
          color: #ff8b91;
          font-family: var(--font-bebas);
          font-size: 0.82rem;
          letter-spacing: 0.08em;
        }

        /* Sidebar arcade syntax refine */
        .ggst-sidebar__link {
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 9px, 100% 100%, 0 100%);
        }

        .ggst-sidebar__link--idle::after {
          content: "";
          position: absolute;
          top: -1px;
          right: -1px;
          width: 0.9rem;
          height: 0.9rem;
          background: linear-gradient(180deg, rgba(199, 161, 40, 0.22), rgba(0, 0, 0, 0));
          clip-path: polygon(100% 0, 100% 100%, 0 0);
          opacity: 0.72;
        }

        .ggst-sidebar__link--active {
          clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%);
        }

        .ggst-sidebar__link--active::after {
          content: "";
          position: absolute;
          top: -1px;
          right: 0.75rem;
          width: 1.3rem;
          height: 0.45rem;
          background: linear-gradient(90deg, #f7e0a2, #c7a128);
          box-shadow: 2px 2px 0 #000000;
          clip-path: polygon(0 0, 100% 0, calc(100% - 7px) 100%, 0 100%);
          opacity: 0.88;
        }

        .ggst-sidebar__icon {
          clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%);
        }

        .ggst-sidebar__player-card {
          position: relative;
          overflow: hidden;
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
        }

        .ggst-sidebar__player-card::before {
          content: "";
          position: absolute;
          top: -1px;
          right: 1rem;
          width: 2.25rem;
          height: 0.36rem;
          background: linear-gradient(90deg, rgba(199, 161, 40, 0.94), rgba(255, 255, 255, 0.2));
          clip-path: polygon(0 0, 100% 0, calc(100% - 9px) 100%, 0 100%);
          box-shadow: 2px 2px 0 #000000;
        }
      `}</style>
    </div>
  );
}
