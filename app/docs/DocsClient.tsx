"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";

interface DocsClientProps {
  userManual: string;
  adminManual: string;
  deploymentGuide: string;
}

export default function DocsClient({
  userManual,
  adminManual,
  deploymentGuide,
}: DocsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"user" | "admin" | "deploy">("user");

  const getActiveContent = () => {
    if (activeTab === "user") return userManual;
    if (activeTab === "admin") return adminManual;
    return deploymentGuide;
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto relative z-10 p-4 sm:p-8">
        <div className="flex justify-between items-center mb-8 transform -skew-x-2 bg-[#1a1a1a] border border-neutral-800 p-4">
          <div className="transform skew-x-2">
            <h1 className="text-4xl font-black text-white tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>TACTICAL ARCHIVES</h1>
            <p className="text-red-500 text-sm tracking-widest font-bold uppercase">System Documentation Center</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Tabs Sidebar */}
          <div className="md:w-64 flex flex-col gap-4 transform -skew-x-2">
            <button
              onClick={() => setActiveTab("user")}
              className={`p-4 text-xl tracking-widest font-bold border-2 transition-all text-left ${
                activeTab === "user"
                  ? "bg-red-600 text-white border-red-500 shadow-[4px_4px_0px_rgba(239,68,68,0.8)] translate-x-2"
                  : "bg-black/80 text-neutral-400 border-neutral-700 hover:border-red-500/50 hover:text-red-400"
              }`}
              style={{ fontFamily: "var(--font-bebas)" }}
            >
              📖 新兵手册 (USER)
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`p-4 text-xl tracking-widest font-bold border-2 transition-all text-left ${
                activeTab === "admin"
                  ? "bg-red-600 text-white border-red-500 shadow-[4px_4px_0px_rgba(239,68,68,0.8)] translate-x-2"
                  : "bg-black/80 text-neutral-400 border-neutral-700 hover:border-red-500/50 hover:text-red-400"
              }`}
              style={{ fontFamily: "var(--font-bebas)" }}
            >
              ⚙️ 统帅指南 (ADMIN)
            </button>
            <button
              onClick={() => setActiveTab("deploy")}
              className={`p-4 text-xl tracking-widest font-bold border-2 transition-all text-left ${
                activeTab === "deploy"
                  ? "bg-red-600 text-white border-red-500 shadow-[4px_4px_0px_rgba(239,68,68,0.8)] translate-x-2"
                  : "bg-black/80 text-neutral-400 border-neutral-700 hover:border-red-500/50 hover:text-red-400"
              }`}
              style={{ fontFamily: "var(--font-bebas)" }}
            >
              🚀 系统部署 (DEPLOY)
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-black/90 border-2 border-neutral-700 p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] relative overflow-hidden transform -skew-x-2 min-h-[60vh]">
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-600 pointer-events-none z-20"></div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="transform skew-x-2 prose prose-invert max-w-none
                           prose-headings:font-black prose-h1:text-4xl prose-h1:text-red-500 prose-h1:tracking-widest prose-h1:drop-shadow-[2px_2px_0px_rgba(239,68,68,0.5)]
                           prose-h2:text-2xl prose-h2:text-white prose-h2:border-b-2 prose-h2:border-neutral-800 prose-h2:pb-2 prose-h2:mt-10
                           prose-a:text-red-400 prose-a:no-underline hover:prose-a:text-white hover:prose-a:bg-red-600 hover:prose-a:px-1
                           prose-code:bg-neutral-900 prose-code:text-yellow-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                           prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-neutral-800 prose-pre:shadow-[4px_4px_0px_rgba(38,38,38,1)] prose-pre:rounded-none
                           prose-strong:text-red-400
                           prose-li:marker:text-red-500"
              >
                {/* Apply Bebas Neue font specifically to h1/h2 in markdown via CSS class override */}
                <style jsx global>{`
                  .prose h1, .prose h2 { font-family: var(--font-bebas); }
                `}</style>

                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {getActiveContent()}
                </ReactMarkdown>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
