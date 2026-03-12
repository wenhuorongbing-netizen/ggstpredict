// app/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // 极简状态管理：如果本地有登录记录，直接跳到预测大厅 (我们稍后做这个页面)
  useEffect(() => {
    if (localStorage.getItem("userId")) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
    } else {
      // 登录成功，把玩家信息存在浏览器本地
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("points", data.user.points.toString());
      
      // 跳转到预测大厅
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white p-4">
      <div className="max-w-md w-full bg-neutral-900 p-8 rounded-xl shadow-2xl border border-neutral-800">
        <h1 className="text-3xl font-bold mb-2 text-center text-red-500">罪恶装备预测局</h1>
        <p className="text-neutral-400 text-center mb-8 text-sm">
          输入账号密码。若无账号将自动注册并获赠 1000 初始积分。
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input
              type="text"
              placeholder="你的代号 (Username)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="通行密钥 (Password)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition-colors"
          >
            进入战场
          </button>
        </form>
      </div>
    </div>
  );
}