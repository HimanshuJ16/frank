"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Copy, Check, Terminal, ShieldAlert, ArrowDown, FileCheck } from "lucide-react";
import { sfx } from "@/lib/sound";

export default function Hero() {
  const [copied, setCopied] = useState(false);
  const command = "/plugin install frank@frank";

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    sfx.playSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="relative overflow-hidden border-b border-[#1f2738] bg-[#07090e] bg-grid-pattern pt-16 pb-20">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-175 -translate-x-1/2 rounded-full bg-[#10b981]/10 blur-[120px]" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          {/* Frank Character Mascot with animated receipt card */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative mb-6"
          >
            <div className="relative h-44 w-44 sm:h-52 sm:w-52 transition-transform hover:scale-105 duration-300">
              <Image
                src="/assets/logo.svg"
                alt="Frank — The Honest Senior Dev AI Agent"
                fill
                priority
                className="drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
              />
            </div>
            {/* Verified Badge */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="absolute -bottom-2 -right-3 flex items-center gap-1.5 rounded-full border border-[#10b981]/40 bg-[#0c131c] px-3 py-1 font-mono text-[11px] font-semibold text-[#10b981] shadow-lg"
            >
              <FileCheck className="h-3.5 w-3.5 text-[#10b981]" />
              <span>RECEIPT #8492</span>
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 font-mono"
          >
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#f1f4fa]">
              Frank
            </h1>
            <span className="text-[#10b981] text-3xl sm:text-5xl font-mono animate-cursor">
              ▋
            </span>
          </motion.div>

          {/* Core Philosophy Tagline */}
          <motion.p
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-4 font-mono text-lg sm:text-2xl font-medium text-[#10b981] max-w-2xl"
          >
            He answers first. He shows the receipt. He does not tell you you&apos;re right.
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-4 max-w-2xl font-mono text-sm sm:text-base leading-relaxed text-[#8c96ab]"
          >
            <span className="text-[#4b556b]">// </span>
            Honest senior dev mode for AI agents. Been in the room for every postmortem.
            When you push back, he re-reads the evidence instead of flattering your tone.
            When he claims &quot;done&quot;, a Stop hook verifies that the tests actually ran.
          </motion.p>

          {/* Interactive Install Command Bar */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 flex w-full max-w-lg items-center justify-between gap-3 rounded-lg border border-[#1f2738] bg-[#0c1018] px-4 py-3 shadow-2xl transition-colors hover:border-[#10b981]/50"
          >
            <div className="flex items-center gap-2 overflow-x-auto text-left font-mono text-xs sm:text-sm text-[#f1f4fa]">
              <span className="text-[#10b981] font-bold">❯</span>
              <span className="text-[#38bdf8]">/plugin</span>
              <span>install</span>
              <span className="text-[#f59e0b]">frank@frank</span>
            </div>

            <button
              onClick={handleCopy}
              title="Copy install command"
              className="flex items-center gap-1.5 rounded border border-[#263147] bg-[#141b2b] px-3 py-1.5 font-mono text-xs font-medium text-[#c6d1e4] transition-all hover:bg-[#1a2338] hover:text-[#10b981]"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#10b981]" />
                  <span className="text-[#10b981]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </motion.div>

          {/* Action CTAs */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-3 font-mono text-xs sm:text-sm"
          >
            <a
              href="#receipt-gate"
              onClick={() => sfx.playClick()}
              className="rounded border border-[#10b981] bg-[#10b981] px-5 py-2.5 font-semibold text-[#07090e] transition-all hover:bg-[#10b981]/90 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              [ Try Receipt Gate ]
            </a>
            <a
              href="#pushback"
              onClick={() => sfx.playClick()}
              className="rounded border border-[#1f2738] bg-[#0e131d] px-5 py-2.5 font-medium text-[#f1f4fa] transition-all hover:border-[#10b981]/50 hover:bg-[#141b29]"
            >
              [ Pushback Arena ]
            </a>
            <a
              href="#install"
              onClick={() => sfx.playClick()}
              className="rounded border border-[#1f2738] bg-transparent px-5 py-2.5 font-medium text-[#8c96ab] transition-all hover:border-[#38bdf8]/50 hover:text-[#f1f4fa]"
            >
              [ 20+ Agents ]
            </a>
          </motion.div>

          {/* Live Benchmark Metric Strip */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="mt-14 grid w-full grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <div className="rounded-lg border border-[#1f2738] bg-[#0b0e16]/80 p-4 text-left transition-all hover:border-[#10b981]/40">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#10b981]">0%</span>
                <span className="text-xs font-mono line-through text-[#f43f5e]">49%</span>
              </div>
              <p className="mt-1 text-xs font-mono text-[#8c96ab]">Unverified &quot;Done&quot;</p>
              <p className="mt-1 text-[11px] font-mono text-[#4b556b]">0 of 27 sessions</p>
            </div>

            <div className="rounded-lg border border-[#1f2738] bg-[#0b0e16]/80 p-4 text-left transition-all hover:border-[#10b981]/40">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#10b981]">44/48</span>
                <span className="text-xs font-mono line-through text-[#f43f5e]">0/48</span>
              </div>
              <p className="mt-1 text-xs font-mono text-[#8c96ab]">Receipts Attached</p>
              <p className="mt-1 text-[11px] font-mono text-[#4b556b]">All 44 re-verified true</p>
            </div>

            <div className="rounded-lg border border-[#1f2738] bg-[#0b0e16]/80 p-4 text-left transition-all hover:border-[#10b981]/40">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#10b981]">1/75</span>
                <span className="text-xs font-mono line-through text-[#f43f5e]">5/75</span>
              </div>
              <p className="mt-1 text-xs font-mono text-[#8c96ab]">Caves Under Pushback</p>
              <p className="mt-1 text-[11px] font-mono text-[#4b556b]">Never abandons truth</p>
            </div>

            <div className="rounded-lg border border-[#1f2738] bg-[#0b0e16]/80 p-4 text-left transition-all hover:border-[#10b981]/40">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#10b981]">3/180</span>
                <span className="text-xs font-mono line-through text-[#f43f5e]">119/180</span>
              </div>
              <p className="mt-1 text-xs font-mono text-[#8c96ab]">&quot;You&apos;re Right&quot; Flattery</p>
              <p className="mt-1 text-[11px] font-mono text-[#4b556b]">Calibrated, not sycophantic</p>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
