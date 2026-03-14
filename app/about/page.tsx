"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-4xl mx-auto relative z-10 p-4 sm:p-8 h-full flex flex-col justify-center">

          <div className="flex justify-between items-center mb-12 transform -skew-x-2 bg-[#1a1a1a] border border-neutral-800 p-4">
            <div className="transform skew-x-2">
              <h1 className="text-4xl font-black text-white tracking-widest drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]" style={{ fontFamily: "var(--font-bebas)" }}>
                ABOUT PROJECT
              </h1>
              <p className="text-red-500 text-sm tracking-widest font-bold uppercase">关于本项目</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/80 border-2 border-red-900 p-8 shadow-[8px_8px_0px_rgba(239,68,68,0.3)] relative overflow-hidden transform -skew-x-2"
          >
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 pointer-events-none z-20"></div>

            <div className="transform skew-x-2 space-y-6">
              <h2 className="text-3xl font-black text-white tracking-widest flex items-center gap-2" style={{ fontFamily: "var(--font-bebas)" }}>
                 <span className="text-red-500">{"//"}</span> OPEN SOURCE FGC PREDICTION BUREAU
              </h2>

              <div className="text-neutral-300 leading-relaxed font-medium">
                <p className="mb-4">
                  “罪恶装备预测局” (GGST Prediction Bureau) 是一个为格斗游戏社区 (FGC) 打造的极简、开源的赛事预测平台。
                  本项目没有真实的金钱交易，纯粹为社区观赛增添乐趣而生。
                </p>
                <p className="mb-4">
                  采用 Next.js, Tailwind CSS, Prisma 驱动，并深度定制了 Guilty Gear Strive 的视觉语言与交互反馈。
                  从动态的 Pari-Mutuel 奖池算法，到全自动的赛事抓取引擎，皆为开源构建。
                </p>
                <p className="text-neutral-500 text-sm italic border-l-2 border-neutral-700 pl-4 mt-8">
                  "Heaven or Hell, Let's Rock!"
                </p>
              </div>

              <div className="pt-8 flex justify-center mt-8 border-t-2 border-neutral-800/50">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="ggst-button bg-black border-white hover:bg-white hover:text-black text-white px-8 py-4 text-xl font-black tracking-widest transition-all shadow-[6px_6px_0px_rgba(255,255,255,0.2)] hover:shadow-[2px_2px_0px_rgba(255,255,255,1)] translate-x-[-2px] translate-y-[-2px] hover:translate-x-0 hover:translate-y-0"
                  style={{ fontFamily: "var(--font-bebas)" }}
                >
                  [ 🔗 VIEW ON GITHUB ]
                </a>
              </div>
            </div>
          </motion.div>

        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
