// app/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登录失败");
      } else {
        if (typeof window !== "undefined") {
            localStorage.setItem("userId", data.user.id);
            localStorage.setItem("username", data.user.username);
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
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white p-4 font-sans selection:bg-red-500/30">
      <div className="max-w-md w-full bg-neutral-900/80 p-8 rounded-2xl shadow-2xl border border-neutral-800/80 backdrop-blur-sm relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <h1 className="text-4xl font-black mb-3 text-center text-red-500 tracking-tighter drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]">
          GGST 预测局
        </h1>
        <p className="text-neutral-400 text-center mb-8 text-sm font-medium tracking-wide">
          输入账号密码即刻开战。新玩家自动获赠 <span className="text-red-400 font-mono">1000</span> 积分。
        </p>

        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">
              用户代号 (Username)
            </label>
            <input
              id="username"
              type="text"
              placeholder="Player1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-neutral-950/80 border border-neutral-700/80 rounded-lg p-3.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-neutral-600 font-medium"
              required
              disabled={isLoading}
              autoComplete="username"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">
              通行密钥 (Password)
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-950/80 border border-neutral-700/80 rounded-lg p-3.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-neutral-600 font-medium tracking-widest"
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
          
          {error && (
            <div className="bg-red-950/50 border border-red-500/30 text-red-400 text-sm p-3.5 rounded-lg text-center animate-pulse font-medium shadow-inner" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-lg font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 focus-visible:ring-red-500 ${
              isLoading
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700"
                : "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] border border-red-500/50"
            }`}
            aria-busy={isLoading}
          >
            {isLoading ? "正在链接..." : "进入战场 (Enter)"}
          </button>
        </form>
      </div>
    </div>
  );
}