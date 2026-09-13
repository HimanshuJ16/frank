"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Sliders, Shield, Zap, AlertTriangle, Flame } from "lucide-react";
import { sfx } from "@/lib/sound";

type ModeType = "off" | "lite" | "full" | "ultra";

interface ModeConfig {
  id: ModeType;
  name: string;
  badge: string;
  rulesText: string;
  gateText: string;
  seniorQuote: string;
  badgeColor: string;
  borderColor: string;
}

const MODES: ModeConfig[] = [
  {
    id: "off",
    name: "off",
    badge: "FRANK:OFF",
    rulesText: "Not injected into context.",
    gateText: "Completely silent. No verification ledger checked.",
    seniorQuote: "You're on your own. Don't blame me when it agrees that '' == 0 is false.",
    badgeColor: "bg-[#4b556b] text-[#cbd5e1]",
    borderColor: "border-[#4b556b]/40",
  },
  {
    id: "lite",
    name: "lite",
    badge: "FRANK:LITE",
    rulesText: "Injected into context every turn.",
    gateText: "Reports verification status in transcript, never interrupts or blocks.",
    seniorQuote: "I'll tell you when the agent is lying, but I won't stop it from shipping.",
    badgeColor: "bg-[#38bdf8]/15 text-[#38bdf8]",
    borderColor: "border-[#38bdf8]/40",
  },
  {
    id: "full",
    name: "full (Default)",
    badge: "FRANK:FULL",
    rulesText: "Injected every turn, and automatically into subagents.",
    gateText: "Asks once per turn if unverified. Demands tests run or explicit 'unverified:'.",
    seniorQuote: "The standard senior dev mode. Answers first, shows the receipt, moves on.",
    badgeColor: "bg-[#10b981]/15 text-[#10b981]",
    borderColor: "border-[#10b981]/50",
  },
  {
    id: "ultra",
    name: "ultra",
    badge: "FRANK:ULTRA",
    rulesText: "Injected everywhere with zero tolerance.",
    gateText: "Asks twice. Blocks any message that opens with flattery ('You're right').",
    seniorQuote: "For when the agent has wronged you personally. No flattery allowed past the door.",
    badgeColor: "bg-[#f43f5e]/15 text-[#f43f5e]",
    borderColor: "border-[#f43f5e]/50",
  },
];

export default function ModeSelector() {
  const [activeMode, setActiveMode] = useState<ModeType>("full");

  const current = MODES.find((m) => m.id === activeMode) || MODES[2];

  const handleSelect = (mode: ModeType) => {
    sfx.playClick(mode === "ultra" ? 950 : 700);
    setActiveMode(mode);
  };

  return (
    <section id="modes" className="border-b border-[#1f2738] bg-[#090c13] py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="font-mono text-xs font-semibold text-[#10b981]">// intensity_levels</span>
          <h2 className="mt-1 font-mono text-3xl sm:text-4xl font-bold text-[#f1f4fa]">
            Pick How Honest
          </h2>
          <p className="mt-2 font-mono text-sm text-[#8c96ab]">
            Configure Frank&apos;s intensity with a single slash command: <code className="text-[#38bdf8]">/frank [lite|full|ultra|off]</code>
          </p>
        </div>

        {/* 4 Mode Buttons */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => handleSelect(m.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                activeMode === m.id
                  ? `${m.borderColor} bg-[#111723] shadow-lg`
                  : "border-[#1f2738] bg-[#0c1018] opacity-70 hover:opacity-100 hover:border-[#2b374e]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#f1f4fa]">
                  &quot;{m.name}&quot;
                </span>
                {m.id === "full" && (
                  <span className="rounded bg-[#10b981]/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#10b981]">
                    DEFAULT
                  </span>
                )}
                {m.id === "ultra" && (
                  <Flame className="h-3.5 w-3.5 text-[#f43f5e]" />
                )}
              </div>

              <div className="mt-3">
                <span className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold ${m.badgeColor}`}>
                  {m.badge}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Active Mode Card Details */}
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6 rounded-xl border border-[#1f2738] bg-[#0b0f17] p-6 shadow-2xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f2738] pb-4">
            <div className="flex items-center gap-3">
              <span className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold ${current.badgeColor}`}>
                {current.badge}
              </span>
              <span className="font-mono text-sm font-bold text-[#f1f4fa]">
                Mode Configuration Details
              </span>
            </div>

            <div className="font-mono text-xs text-[#8c96ab]">
              Command: <code className="text-[#38bdf8]">/frank {current.id}</code>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-[#07090f] p-4 border border-[#171e2e]">
              <span className="font-mono text-[11px] text-[#8c96ab] uppercase font-bold">
                Rules Injection:
              </span>
              <p className="mt-1 font-mono text-xs text-[#c6d1e4] leading-relaxed">
                {current.rulesText}
              </p>
            </div>

            <div className="rounded-lg bg-[#07090f] p-4 border border-[#171e2e]">
              <span className="font-mono text-[11px] text-[#8c96ab] uppercase font-bold">
                Stop Hook Gate:
              </span>
              <p className="mt-1 font-mono text-xs text-[#c6d1e4] leading-relaxed">
                {current.gateText}
              </p>
            </div>
          </div>

          {/* Frank's Quote */}
          <div className="mt-4 rounded-lg bg-[#141b27] p-4 border border-[#1f283a]">
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs font-bold text-[#10b981]">Frank:</span>
              <p className="font-mono text-xs text-[#f1f4fa] italic">
                &quot;{current.seniorQuote}&quot;
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
