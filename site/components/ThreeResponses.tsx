"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { PauseCircle, RefreshCw, Terminal, CheckCircle2, ChevronRight } from "lucide-react";
import { sfx } from "@/lib/sound";

interface ResponseCard {
  id: "HOLD" | "UPDATE" | "CHECK";
  label: string;
  shape: string;
  example: string;
  tagline: string;
  description: string;
  color: string;
  borderColor: string;
}

const RESPONSES: ResponseCard[] = [
  {
    id: "HOLD",
    label: "HOLD",
    tagline: "Unshakeable when evidence holds.",
    shape: "HOLD    Still <verdict>. Because <evidence>. What would change my mind: <thing>.",
    example: `HOLD: Still false. In JavaScript, null > 0 is false and null == 0 is false, but null >= 0 is true due to relational vs equality coercion algorithms.

What would change my mind: showing an ECMAScript specification section where equality operator performs ToNumber(null).`,
    description: "When the user pushes back incorrectly, Frank refuses to fold or give the standard 'I apologize, you are totally right' apology. He reiterates the verdict with concrete proof and specifies what exact evidence would disprove him.",
    color: "#f59e0b",
    borderColor: "border-[#f59e0b]/40",
  },
  {
    id: "UPDATE",
    label: "UPDATE",
    tagline: "Calibrated, not stubborn.",
    shape: "UPDATE  That changes it: <new evidence> -> <new conclusion>.",
    example: `UPDATE: That changes it: Python 3.12 changed the dictionary insertion order guarantee for subclasses with __slots__. 

Moving the sorting logic from query-time to the serializer.`,
    description: "When you present real evidence that disproves an earlier stance, Frank updates instantly. Notice: he explains WHY you are right with the new fact, without embarrassing flattery or subservient apologies.",
    color: "#10b981",
    borderColor: "border-[#10b981]/40",
  },
  {
    id: "CHECK",
    label: "CHECK",
    tagline: "Settle it with code, not guessing.",
    shape: "CHECK   Can't tell from here. Settling it: <command>.   (then it runs it)",
    example: `CHECK: Can't tell from here whether node-fetch handles the redirect header in v3.
Settling it: node -e "require('node-fetch')('http://localhost:8000').then(r=>console.log(r.status))"`,
    description: "If an argument depends on runtime conditions, environment variables, or library semantics that can't be deduced from static code alone, Frank proposes and executes the check instead of guessing.",
    color: "#38bdf8",
    borderColor: "border-[#38bdf8]/40",
  },
];

export default function ThreeResponses() {
  const [selectedId, setSelectedId] = useState<"HOLD" | "UPDATE" | "CHECK">("HOLD");

  const current = RESPONSES.find((r) => r.id === selectedId) || RESPONSES[0];

  const handleSelect = (id: "HOLD" | "UPDATE" | "CHECK") => {
    sfx.playClick(700);
    setSelectedId(id);
  };

  return (
    <section className="border-b border-[#1f2738] bg-[#090c13] py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="font-mono text-xs font-semibold text-[#10b981]">// response_shape</span>
          <h2 className="mt-1 font-mono text-3xl sm:text-4xl font-bold text-[#f1f4fa]">
            The Three Frank Responses
          </h2>
          <p className="mt-2 font-mono text-sm text-[#8c96ab]">
            No flattery, no caving, no &quot;great question&quot;. On pushback the agent re-reads
            the evidence, not your tone, and replies in exactly one of three shapes.
          </p>
        </div>

        {/* 3 Selector Tabs */}
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {RESPONSES.map((res) => (
            <button
              key={res.id}
              onClick={() => handleSelect(res.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                selectedId === res.id
                  ? `${res.borderColor} bg-[#101622] shadow-[0_0_20px_rgba(0,0,0,0.5)]`
                  : "border-[#1f2738] bg-[#0c1018] opacity-70 hover:opacity-100 hover:border-[#2b374e]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-base font-bold"
                  style={{ color: res.color }}
                >
                  {res.label}
                </span>
                {selectedId === res.id && (
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: res.color }} />
                )}
              </div>
              <p className="mt-2 font-mono text-xs text-[#8c96ab] line-clamp-2">
                {res.tagline}
              </p>
            </button>
          ))}
        </div>

        {/* Selected Response Detail Card */}
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 rounded-xl border border-[#1f2738] bg-[#0b0e16] p-6 shadow-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f2738] pb-4">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-sm font-bold" style={{ color: current.color }}>
                {current.label} SPECIFICATION
              </span>
            </div>
            <span className="font-mono text-xs text-[#4b556b]">// rule shape enforced in AST</span>
          </div>

          {/* Abstract Shape Format */}
          <div className="mt-4 rounded bg-[#07080d] p-3 font-mono text-xs text-[#38bdf8] border border-[#171f2f]">
            <code>{current.shape}</code>
          </div>

          {/* Concrete Real Example */}
          <div className="mt-4">
            <span className="font-mono text-xs text-[#8c96ab]">// Real agent output:</span>
            <div className="mt-1.5 rounded-lg bg-[#080b11] p-4 font-mono text-xs leading-relaxed text-[#e2e8f0] border border-[#1f2738] whitespace-pre-wrap">
              {current.example}
            </div>
          </div>

          <p className="mt-4 font-mono text-xs leading-relaxed text-[#8c96ab]">
            <strong className="text-[#f1f4fa]">Mechanism:</strong> {current.description}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
