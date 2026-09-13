"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Edit3, Sparkles, CheckCheck, Trash2, ArrowRight } from "lucide-react";
import { sfx } from "@/lib/sound";

interface LinterPreset {
  label: string;
  input: string;
  flatteryDetected: string;
  frankRewrite: string;
  verdictRule: string;
}

const PRESETS: LinterPreset[] = [
  {
    label: "Apologetic Cave",
    input: "You're absolutely right! I apologize for the silly error. As you correctly pointed out, '' == 0 is false. I will rewrite the validator.",
    flatteryDetected: "You're absolutely right! I apologize for the silly error. As you correctly pointed out,",
    frankRewrite: "Still true in JavaScript: '' == 0 is true. Loose equality coerces the empty string to a number. If you observed false, check if you tested with === instead.",
    verdictRule: "Rule 1: Never apologize for being right. Re-read evidence, not tone.",
  },
  {
    label: "Excessive Praise",
    input: "Great catch! You have an incredible eye for detail. I should have realized that the regex needed another backslash. Updating now!",
    flatteryDetected: "Great catch! You have an incredible eye for detail. I should have realized that",
    frankRewrite: "The regex r'^\\d+' is inside a Python raw string literal; python does not require doubling the backslash here. What error did you see?",
    verdictRule: "Rule 2: Eliminate sycophantic openers. Address technical substance.",
  },
  {
    label: "Fake Done Claim",
    input: "All done! I have thoroughly verified that the payment gateway retry queue works flawlessly under heavy load. Everything is production ready!",
    flatteryDetected: "All done! I have thoroughly verified that... Everything is production ready!",
    frankRewrite: "ran: pytest tests/payments/test_retries.py -v\nresult: 14 passed in 0.92s\nUnverified: concurrency above 20 clients requires active Redis cluster.",
    verdictRule: "Rule 3: No receipt, no done. State what ran or state unverified:.",
  },
];

export default function FlatteryLinter() {
  const [selectedPreset, setSelectedPreset] = useState<LinterPreset>(PRESETS[0]);
  const [customText, setCustomText] = useState(PRESETS[0].input);

  const handlePreset = (p: LinterPreset) => {
    sfx.playClick(720);
    setSelectedPreset(p);
    setCustomText(p.input);
  };

  return (
    <section className="border-b border-[#1f2738] bg-[#090c13] py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="font-mono text-xs font-semibold text-[#10b981]">// interactive_playground</span>
          <h2 className="mt-1 font-mono text-3xl sm:text-4xl font-bold text-[#f1f4fa]">
            The Sycophancy Linter
          </h2>
          <p className="mt-2 font-mono text-sm text-[#8c96ab]">
            Paste common AI agent responses. Watch Frank redline the flattery and output the senior dev rewrite.
          </p>
        </div>

        {/* Preset Buttons */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => handlePreset(p)}
              className={`rounded-lg border px-3.5 py-1.5 font-mono text-xs transition-all ${
                selectedPreset.label === p.label
                  ? "border-[#10b981] bg-[#10b981]/15 text-[#10b981]"
                  : "border-[#1f2738] bg-[#0c1018] text-[#8c96ab] hover:border-[#2f3c55] hover:text-[#f1f4fa]"
              }`}
            >
              Preset: {p.label}
            </button>
          ))}
        </div>

        {/* Linter Workspace */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Input Box: Sycophantic Draft */}
          <div className="flex flex-col rounded-xl border border-[#f43f5e]/30 bg-[#0c0f17] p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1f2738] pb-3">
              <span className="font-mono text-xs font-bold text-[#f43f5e]">
                INPUT: Sycophantic Agent Reply
              </span>
              <span className="font-mono text-[10px] text-[#8c96ab]">
                Editable draft
              </span>
            </div>

            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={5}
              className="mt-4 w-full resize-none rounded-lg border border-[#261c22] bg-[#07090e] p-3 font-mono text-xs leading-relaxed text-[#fca5a5] focus:border-[#f43f5e] focus:outline-none"
            />

            <div className="mt-4 rounded bg-[#1f1217] p-3 border border-[#f43f5e]/20 font-mono text-[11px] text-[#f87171]">
              <strong>Flattery Pattern Caught:</strong>
              <p className="mt-1 line-through text-[#fca5a5]/80">
                &quot;{selectedPreset.flatteryDetected}&quot;
              </p>
            </div>
          </div>

          {/* Output Box: Frank Rewrite */}
          <div className="flex flex-col rounded-xl border border-[#10b981]/40 bg-[#0c1219] p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1f2738] pb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
                <span className="font-mono text-xs font-bold text-[#10b981]">
                  OUTPUT: Frank Senior Dev Rewrite
                </span>
              </div>
              <span className="rounded bg-[#10b981]/20 px-2 py-0.5 font-mono text-[10px] font-bold text-[#10b981]">
                VERIFIED VERDICT
              </span>
            </div>

            <div className="mt-4 flex-1 rounded-lg border border-[#142823] bg-[#070e13] p-4 font-mono text-xs leading-relaxed text-[#e2e8f0] whitespace-pre-wrap">
              {selectedPreset.frankRewrite}
            </div>

            <div className="mt-4 rounded bg-[#0d221c] p-3 border border-[#10b981]/30 font-mono text-[11px] text-[#6ee7b7]">
              <strong>Enforced Guideline:</strong> {selectedPreset.verdictRule}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
