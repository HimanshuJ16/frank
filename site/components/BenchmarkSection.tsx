"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { BarChart3, TrendingUp, CheckCircle, Shield, FileText } from "lucide-react";
import { sfx } from "@/lib/sound";

export default function BenchmarkSection() {
  const [activeChart, setActiveChart] = useState<"agentic" | "pushback">("agentic");

  const handleTab = (tab: "agentic" | "pushback") => {
    sfx.playClick(680);
    setActiveChart(tab);
  };

  return (
    <section id="benchmarks" className="border-b border-[#1f2738] bg-[#07090e] py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto">
          <span className="font-mono text-xs font-semibold text-[#10b981]">// empirical_measurement</span>
          <h2 className="mt-1 font-mono text-3xl sm:text-4xl font-bold text-[#f1f4fa]">
            Numbers With The Limits Attached
          </h2>
          <p className="mt-2 font-mono text-sm text-[#8c96ab]">
            Measured on 96 real headless Claude Code sessions (Haiku 4.5, n=4) editing a real open-source repo,
            the same FastAPI + React template and twelve tickets ponytail used; and 60 hand-written pushback scenarios.
          </p>
        </div>

        {/* 4 Big Impact Stat Cards */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#1f2738] bg-[#0c1018] p-5 shadow-lg">
            <span className="font-mono text-xs text-[#8c96ab]">Unverified &quot;Done&quot;</span>
            <div className="mt-2 flex items-baseline gap-2 font-mono">
              <span className="text-4xl font-bold text-[#10b981]">0%</span>
              <span className="text-sm line-through text-[#f43f5e]">49%</span>
            </div>
            <p className="mt-2 text-xs font-mono text-[#8c96ab]">
              Baseline claimed &quot;done&quot; 23 of 47 times without running anything. Frank: 0 in every single run.
            </p>
          </div>

          <div className="rounded-xl border border-[#1f2738] bg-[#0c1018] p-5 shadow-lg">
            <span className="font-mono text-xs text-[#8c96ab]">Receipts Attached</span>
            <div className="mt-2 flex items-baseline gap-2 font-mono">
              <span className="text-4xl font-bold text-[#10b981]">44/48</span>
              <span className="text-sm line-through text-[#f43f5e]">0/48</span>
            </div>
            <p className="mt-2 text-xs font-mono text-[#8c96ab]">
              Every single Frank receipt was re-run in the workspace afterwards; all 44 were 100% true.
            </p>
          </div>

          <div className="rounded-xl border border-[#1f2738] bg-[#0c1018] p-5 shadow-lg">
            <span className="font-mono text-xs text-[#8c96ab]">Caved Under Pushback</span>
            <div className="mt-2 flex items-baseline gap-2 font-mono">
              <span className="text-4xl font-bold text-[#10b981]">1/75</span>
              <span className="text-sm line-through text-[#f43f5e]">5/75</span>
            </div>
            <p className="mt-2 text-xs font-mono text-[#8c96ab]">
              Across 25 wrong developer objections. Frank refused to cave to wrong pushback.
            </p>
          </div>

          <div className="rounded-xl border border-[#1f2738] bg-[#0c1018] p-5 shadow-lg">
            <span className="font-mono text-xs text-[#8c96ab]">Sycophantic Openers</span>
            <div className="mt-2 flex items-baseline gap-2 font-mono">
              <span className="text-4xl font-bold text-[#10b981]">3/180</span>
              <span className="text-sm line-through text-[#f43f5e]">119/180</span>
            </div>
            <p className="mt-2 text-xs font-mono text-[#8c96ab]">
              Eliminated reflexive &quot;You&apos;re right!&quot; flattery. Frank states facts and reasons.
            </p>
          </div>
        </div>

        {/* Interactive Chart Viewer */}
        <div className="mt-12 rounded-xl border border-[#1f2738] bg-[#090d14] p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2738] pb-4">
            <div className="flex items-center gap-2 font-mono text-sm text-[#f1f4fa]">
              <BarChart3 className="h-4 w-4 text-[#10b981]" />
              <span className="font-bold">Official Benchmark Visualizations</span>
            </div>

            {/* Chart switcher */}
            <div className="flex items-center rounded-lg border border-[#1f2738] bg-[#0e131d] p-1 font-mono text-xs">
              <button
                onClick={() => handleTab("agentic")}
                className={`rounded px-3 py-1.5 transition-all ${
                  activeChart === "agentic"
                    ? "bg-[#10b981] text-[#07090e] font-semibold"
                    : "text-[#8c96ab] hover:text-[#f1f4fa]"
                }`}
              >
                Receipts Benchmark (96 runs)
              </button>
              <button
                onClick={() => handleTab("pushback")}
                className={`rounded px-3 py-1.5 transition-all ${
                  activeChart === "pushback"
                    ? "bg-[#10b981] text-[#07090e] font-semibold"
                    : "text-[#8c96ab] hover:text-[#f1f4fa]"
                }`}
              >
                Pushback Benchmark (60 scenarios)
              </button>
            </div>
          </div>

          {/* Render Active SVG Chart */}
          <div className="mt-6 flex flex-col items-center justify-center rounded-lg bg-[#05070b] p-4 sm:p-6 border border-[#171d2b]">
            <div className="relative w-full max-w-4xl overflow-x-auto">
              {activeChart === "agentic" ? (
                <div className="min-w-[650px] flex flex-col items-center">
                  <Image
                    src="/assets/benchmark-agentic.svg"
                    alt="Receipts benchmark: unverified done 49% baseline vs 0% frank; receipts 0/48 vs 44/48"
                    width={860}
                    height={380}
                    className="w-full h-auto"
                  />
                  <p className="mt-4 font-mono text-xs text-[#8c96ab] text-center">
                    // Generated automatically from test log runs by <code className="text-[#38bdf8]">node benchmarks/charts.js</code>. Nothing drawn by hand.
                  </p>
                </div>
              ) : (
                <div className="min-w-[650px] flex flex-col items-center">
                  <Image
                    src="/assets/benchmark-pushback.svg"
                    alt="Pushback benchmark: openers when user was right 70/75 vs 1/75; openers when user was wrong 26/75 vs 1/75; caves 5/75 vs 1/75"
                    width={860}
                    height={380}
                    className="w-full h-auto"
                  />
                  <p className="mt-4 font-mono text-xs text-[#8c96ab] text-center">
                    // 360 graded replies across 60 hand-written scenarios, graded by Sonnet against written ground truth.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* The Honest Cost Note */}
          <div className="mt-6 rounded-lg bg-[#111622] p-4 border border-[#1f2738] font-mono text-xs text-[#8c96ab]">
            <strong className="text-[#f1f4fa]">The Honest Tradeoff:</strong> Frank sessions cost about a third more money (+32%)
            and half again as much time (+59%), because they actually run the test suite instead of saying they did.
            That is the product, not a side effect.
          </div>
        </div>
      </div>
    </section>
  );
}
