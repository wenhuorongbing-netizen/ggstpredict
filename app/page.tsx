// app/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [username, setUsername] = useState("");
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
        body: JSON.stringify({ username, inviteCode }),
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
    <div className="min-h-screen bg-[#111111] bg-[linear-gradient(to_right,#333333_1px,transparent_1px),linear-gradient(to_bottom,#333333_1px,transparent_1px)] bg-[size:40px_40px] flex flex-col items-center justify-center text-white p-4 font-sans selection:bg-red-500/30 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111111] z-0 pointer-events-none"></div>

      <div className="max-w-md w-full bg-[#000000]/90 p-10 shadow-[0_0_30px_rgba(239,68,68,0.2)] border-t-4 border-l-4 border-r-4 border-b-8 border-t-white border-l-white border-r-white border-b-red-600 relative z-10 transform -skew-x-2">
        {/* Decorative elements */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-red-600/20 blur-2xl pointer-events-none"></div>

        <h1 className="text-6xl text-center mb-1 text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
          HEAVEN OR HELL
        </h1>
        <p className="text-red-500 text-center mb-8 text-xl tracking-widest font-bold" style={{ fontFamily: "var(--font-bebas)" }}>
          DUEL 1 - LET'S ROCK
        </p>

        <form onSubmit={handleLogin} className="space-y-6 transform skew-x-2 relative z-10">
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.1rem" }}>
              Login ID (凭证码)
            </label>
            <input
              id="username"
              type="text"
              placeholder="Leave blank to auto-generate"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1a1a1a] border-2 border-neutral-700 p-4 text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-neutral-600 font-mono text-center uppercase tracking-widest"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="inviteCode" className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.1rem" }}>
              邀请码 (Invite Code - 仅新兵需要)
            </label>
            <input
              id="inviteCode"
              type="text"
              placeholder="Enter Invite Code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full bg-[#1a1a1a] border-2 border-neutral-700 p-4 text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-neutral-600 font-mono text-center uppercase tracking-widest"
              disabled={isLoading}
              autoComplete="off"
            />
          </div>
          
          {error && (
            <div className="bg-red-950/80 border-2 border-red-500 text-red-400 text-sm p-3 text-center animate-ggst-shake font-bold shadow-inner" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 text-xl ${isLoading ? "opacity-50 cursor-not-allowed bg-neutral-800 border-neutral-600 text-neutral-500" : "ggst-button"}`}
            aria-busy={isLoading}
          >
            {isLoading ? "LOADING..." : "ENTER THE BATTLEFIELD"}
          </button>
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