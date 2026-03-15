// app/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("userId")) {
        router.push("/dashboard");
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, inviteCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登录失败");
      } else {
        if (typeof window !== "undefined") {
            localStorage.setItem("userId", data.user.id);
            localStorage.setItem("username", data.user.username);
            localStorage.setItem("displayName", data.user.displayName);
            localStorage.setItem("role", data.user.role);
            localStorage.setItem("points", data.user.points.toString());
        }
        router.push("/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError("网络连接失败，请检查后端服务是否启动");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_center,_#333333_0%,_#000000_100%)] flex flex-col items-center justify-center text-white p-4 font-sans selection:bg-red-500/30 overflow-hidden relative">
      <div className="absolute inset-0 bg-noise z-0"></div>

      {/* Huge Tilted Watermark */}
      <div
        className="absolute -bottom-20 -left-10 text-[8rem] sm:text-[12rem] font-black text-neutral-800/20 leading-none select-none pointer-events-none transform -skew-x-[20deg] rotate-[-5deg] whitespace-nowrap"
        style={{ fontFamily: "var(--font-bebas)" }}
      >
        MANKIND KNEW THAT THEY CANNOT CHANGE SOCIETY
      </div>

      <div className="max-w-md w-full bg-black/80 backdrop-blur-md p-10 shadow-[0_0_30px_rgba(239,68,68,0.2)] border-l-8 border-b-8 border-red-600 ggst-clip-panel relative z-10">
        <h1 className="text-6xl text-center mb-1 text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
          HEAVEN OR HELL
        </h1>
        <p className="text-red-500 text-center mb-8 text-xl tracking-widest font-bold" style={{ fontFamily: "var(--font-bebas)" }}>
          DUEL 1 - LET&apos;S ROCK
        </p>

        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div className="ggst-input-container">
            <label htmlFor="username" className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.1rem" }}>
              账号 (Account ID)
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter Account ID"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="ggst-input"
              disabled={isLoading}
              autoComplete="username"
            />
            <span className="ggst-input-indicator">&gt;</span>
          </div>

          <div className="ggst-input-container">
            <label htmlFor="password" className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.1rem" }}>
              密码 (Password)
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ggst-input"
              disabled={isLoading}
              autoComplete="current-password"
            />
            <span className="ggst-input-indicator">&gt;</span>
          </div>

          <div className="ggst-input-container">
            <label htmlFor="inviteCode" className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.1rem" }}>
              邀请码 (Invite Code - 仅新注册需要)
            </label>
            <input
              id="inviteCode"
              type="text"
              placeholder="Enter Invite Code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="ggst-input uppercase"
              disabled={isLoading}
              autoComplete="off"
            />
            <span className="ggst-input-indicator">&gt;</span>
          </div>
          
          {error && (
            <div className="bg-red-950/80 border-2 border-red-500 text-red-400 text-sm p-3 text-center animate-ggst-shake font-bold shadow-inner" role="alert">
              {error}
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 text-2xl ${isLoading ? "opacity-50 cursor-not-allowed bg-neutral-800 border-neutral-600 text-neutral-500 transform skew-x-[-15deg]" : "btn-lets-rock"}`}
              aria-busy={isLoading}
            >
              <span>{isLoading ? "LOADING..." : "ENTER THE BATTLEFIELD"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Docs Link */}
      <div className="absolute bottom-6 z-10">
        <a
          href="/docs"
          className="text-neutral-500 hover:text-red-500 hover:bg-black font-mono text-xs tracking-widest transition-all border border-transparent hover:border-red-500 px-3 py-1"
        >
          [ 📖 查阅战地手册 / READ MANUALS ]
        </a>
      </div>
    </div>
  );
}