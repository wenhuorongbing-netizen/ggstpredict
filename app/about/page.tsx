"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="relative z-10 mx-auto flex h-full max-w-4xl flex-col justify-center p-4 sm:p-8">
          <div className="mb-12 flex items-center justify-between border border-neutral-800 bg-[#1a1a1a] p-4 transform -skew-x-2">
            <div className="transform skew-x-2">
              <h1
                className="text-4xl font-black tracking-widest text-white drop-shadow-[2px_2px_0px_rgba(239,68,68,1)]"
                style={{ fontFamily: "var(--font-bebas)" }}
              >
                {"\u5173\u4e8e\u9879\u76ee"}
              </h1>
              <p className="text-sm font-bold tracking-widest text-red-500">
                {"GGST PREDICTION BUREAU"}
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden border-2 border-red-900 bg-black/80 p-8 shadow-[8px_8px_0px_rgba(239,68,68,0.3)] transform -skew-x-2"
          >
            <div className="pointer-events-none absolute right-0 top-0 z-20 h-8 w-8 border-r-4 border-t-4 border-red-500"></div>

            <div className="space-y-6 transform skew-x-2">
              <h2
                className="flex items-center gap-2 text-3xl font-black tracking-widest text-white"
                style={{ fontFamily: "var(--font-bebas)" }}
              >
                <span className="text-red-500">{"//"}</span>
                {"\u89c2\u8d5b\u9884\u6d4b\u7ad9"}
              </h2>

              <div className="space-y-4 leading-relaxed text-neutral-300">
                <p>
                  {"\u8fd9\u662f\u4e00\u4e2a\u7ed9 GGST \u793e\u7fa4\u7528\u7684\u89c2\u8d5b\u9884\u6d4b\u7ad9\u3002\u6ca1\u6709\u771f\u94b1\uff0c\u53ea\u7b97\u7ad9\u5185 W$\u3002"}
                </p>
                <p>
                  {"\u53ef\u4ee5\u770b\u5bf9\u5c40\u3001\u4e0b\u6ce8\u3001\u770b\u699c\u5355\uff0c\u4e5f\u53ef\u4ee5\u5728\u7ba1\u7406\u9875\u5f55\u5165\u548c\u7ed3\u7b97\u6bd4\u8d5b\u3002"}
                </p>
                <p className="text-neutral-400">
                  {"\u7279\u522b\u611f\u8c22\uff1a\u65af\u5361\u8482"}
                </p>
              </div>

              <div className="mt-8 flex justify-center border-t-2 border-neutral-800/50 pt-8">
                <a
                  href="https://github.com/wenhuorongbing-netizen/ggstpredict"
                  target="_blank"
                  rel="noreferrer"
                  className="ggst-button border-white bg-black px-8 py-4 text-xl font-black tracking-widest text-white shadow-[6px_6px_0px_rgba(255,255,255,0.2)] transition-all hover:translate-x-0 hover:translate-y-0 hover:bg-white hover:text-black hover:shadow-[2px_2px_0px_rgba(255,255,255,1)]"
                  style={{ fontFamily: "var(--font-bebas)" }}
                >
                  {"\u67e5\u770b GITHUB"}
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
