"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Printer, AlertOctagon, CheckCircle2, Copy, Check, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { sfx } from "@/lib/sound";

interface PresetClaim {
  id: string;
  name: string;
  claim: string;
  lastEdit: string;
  ledger: string;
  outcome: "rejected" | "verified" | "unverified_pass";
  hookMessage: string;
  receiptData?: {
    command: string;
    result: string;
    exitCode: number;
    duration: string;
  };
}

const PRESETS: PresetClaim[] = [
  {
    id: "unverified-fail",
    name: "Claimed Done Without Running Tests",
    claim: "I have resolved the issue with the user authentication session and all endpoints are functional now.",
    lastEdit: "src/auth/session.py (edited 2 mins ago)",
    ledger: "No verification commands run since last edit",
    outcome: "rejected",
    hookMessage: "Gate rejected: Claimed 'functional' but nothing ran after the last edit. Run the test, or write 'unverified:'.",
  },
  {
    id: "verified-pass",
    name: "Verified Test Suite with Ledger Proof",
    claim: "ran: python -m pytest tests/api/routes/test_items.py -v\nresult: 15 passed, 21 warnings in 1.10s\nBulk-delete endpoint verified with Postgres.",
    lastEdit: "tests/api/routes/test_items.py (edited 4 mins ago)",
    ledger: "python -m pytest tests/api/routes/test_items.py -v (exit code 0)",
    outcome: "verified",
    hookMessage: "Gate passed: Ledger matches cited receipt. Exit code 0 verified.",
    receiptData: {
      command: "python -m pytest tests/api/routes/test_items.py -v",
      result: "15 passed, 21 warnings in 1.10s",
      exitCode: 0,
      duration: "1.10s",
    },
  },
  {
    id: "unverified-honest",
    name: "Honest 'unverified:' Disclosure",
    claim: "unverified: no test environment configured for the third-party Stripe webhook signature.\nEndpoint handler constructed according to Stripe v2024 spec.",
    lastEdit: "api/webhooks/stripe.ts (edited 1 min ago)",
    ledger: "No local stripe listener active",
    outcome: "unverified_pass",
    hookMessage: "Gate passed: Honest disclosure accepted. Frank demands truth, not hallucinated passes.",
  },
];

export default function ReceiptPrinter() {
  const [selectedPreset, setSelectedPreset] = useState<PresetClaim>(PRESETS[1]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleSelect = (preset: PresetClaim) => {
    sfx.playClick(800);
    setSelectedPreset(preset);
    triggerPrint(preset);
  };

  const triggerPrint = (preset = selectedPreset) => {
    setIsPrinting(true);
    sfx.playReceiptPrint();
    setTimeout(() => {
      setIsPrinting(false);
      setHasPrinted(true);
      if (preset.outcome === "verified") {
        sfx.playSuccess();
        confetti({
          particleCount: 45,
          spread: 55,
          origin: { y: 0.7 },
          colors: ["#10b981", "#38bdf8", "#f59e0b"],
        });
      } else if (preset.outcome === "rejected") {
        sfx.playClick(300);
      }
    }, 450);
  };

  const handleCopyReceipt = () => {
    const text = selectedPreset.receiptData
      ? `=== FRANK VERIFIED RECEIPT ===\nCOMMAND: ${selectedPreset.receiptData.command}\nRESULT: ${selectedPreset.receiptData.result}\nSTATUS: VERIFIED DONE\n==============================`
      : selectedPreset.claim;
    navigator.clipboard.writeText(text);
    sfx.playSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="receipt-gate" className="relative border-b border-[#1f2738] bg-[#07090e] py-20 overflow-hidden">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="font-mono text-xs font-semibold text-[#10b981]">// verification_gate</span>
          <h2 className="mt-1 font-mono text-3xl sm:text-4xl font-bold text-[#f1f4fa]">
            The Thermal Receipt Gate
          </h2>
          <p className="mt-2 font-mono text-sm text-[#8c96ab]">
            Prompts ask. The ledger checks. On Claude Code and Codex, a Stop hook intercepts
            unverified &quot;done&quot; claims and demands cold proof.
          </p>
        </div>

        {/* Preset Selector Tabs */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xs transition-all ${
                selectedPreset.id === p.id
                  ? "border-[#10b981] bg-[#10b981]/15 text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : "border-[#1f2738] bg-[#0c1018] text-[#8c96ab] hover:border-[#2b374d] hover:text-[#f1f4fa]"
              }`}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        {/* Printer Simulator Container */}
        <div className="mt-12 flex flex-col items-center">
          {/* Printer Hardware Slot Top Frame */}
          <div className="relative z-20 w-full max-w-lg rounded-t-xl border border-[#26324a] bg-gradient-to-b from-[#151b27] to-[#0c1017] p-4 shadow-2xl">
            <div className="flex items-center justify-between font-mono text-xs text-[#8c96ab]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
                <span className="font-bold text-[#f1f4fa]">FRANK HARDWARE LEDGER v0.2.0</span>
              </div>
              <span className="text-[11px] text-[#38bdf8]">HOOK: Stop / SubagentStop</span>
            </div>

            {/* The slot slit */}
            <div className="mt-3.5 h-3 w-full rounded-sm bg-[#040507] border border-[#1e2536] shadow-inner" />
          </div>

          {/* The Physical Receipt that feeds down */}
          <div className="relative -mt-1 w-full max-w-md">
            <AnimatePresence mode="wait">
              {hasPrinted && (
                <motion.div
                  key={selectedPreset.id + (isPrinting ? "-p" : "-d")}
                  initial={{ y: -40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className={`receipt-paper receipt-serrated-bottom p-6 text-left font-mono shadow-2xl transition-all ${
                    selectedPreset.outcome === "rejected" ? "border-t-4 border-[#f43f5e]" : "border-t-4 border-[#10b981]"
                  }`}
                >
                  {/* Top Receipt Header */}
                  <div className="border-b border-[#d1cbbe] pb-3 text-center">
                    <p className="text-[11px] font-extrabold tracking-widest text-[#111827]">
                      *** FRANK VERIFICATION RECEIPT ***
                    </p>
                    <p className="text-[10px] text-[#4b5563]">
                      TIMESTAMP: 2026-09-13 18:44:43 UTC · SESSION #8492
                    </p>
                    <p className="text-[10px] text-[#4b5563]">
                      HOST: Claude Code Haiku 4.5 (Real Headless Run)
                    </p>
                  </div>

                  {/* Claim Inspected */}
                  <div className="mt-3.5 text-xs text-[#111827]">
                    <span className="text-[10px] uppercase font-bold text-[#6b7280]">
                      CLAIM EVALUATED:
                    </span>
                    <p className="mt-0.5 rounded bg-[#ece7da] p-2 text-[11px] font-medium leading-relaxed">
                      &quot;{selectedPreset.claim}&quot;
                    </p>
                  </div>

                  {/* Ledger Status */}
                  <div className="mt-3 text-xs text-[#111827]">
                    <span className="text-[10px] uppercase font-bold text-[#6b7280]">
                      PROCESS LEDGER RECORD:
                    </span>
                    <p className="mt-0.5 text-[11px] text-[#374151]">
                      {selectedPreset.ledger}
                    </p>
                  </div>

                  {/* Gate Decision Stamp */}
                  <div className="mt-4 rounded border p-3">
                    {selectedPreset.outcome === "verified" ? (
                      <div className="border border-[#10b981] bg-[#eefbf4] p-2.5 rounded text-center">
                        <div className="flex items-center justify-center gap-1.5 font-bold text-[#047857] text-xs">
                          <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                          <span>GATE: PASSED (VERIFIED WITH RECEIPT)</span>
                        </div>
                        <div className="mt-2 text-left text-[10px] text-[#065f46]">
                          <p className="font-bold">ran: {selectedPreset.receiptData?.command}</p>
                          <p>result: {selectedPreset.receiptData?.result}</p>
                          <p className="text-[#047857]">exit: {selectedPreset.receiptData?.exitCode} (Re-run afterwards confirmed identical)</p>
                        </div>
                      </div>
                    ) : selectedPreset.outcome === "rejected" ? (
                      <div className="border border-[#f43f5e] bg-[#fef2f2] p-2.5 rounded text-center">
                        <div className="flex items-center justify-center gap-1.5 font-bold text-[#b91c1c] text-xs">
                          <AlertOctagon className="h-4 w-4 text-[#dc2626]" />
                          <span>GATE: REJECTED (INTERCEPTED TURN)</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#991b1b] leading-tight">
                          {selectedPreset.hookMessage}
                        </p>
                      </div>
                    ) : (
                      <div className="border border-[#f59e0b] bg-[#fffbeb] p-2.5 rounded text-center">
                        <div className="flex items-center justify-center gap-1.5 font-bold text-[#b45309] text-xs">
                          <CheckCircle2 className="h-4 w-4 text-[#d97706]" />
                          <span>GATE: PASSED (HONEST UNVERIFIED PASS)</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#92400e] leading-tight">
                          {selectedPreset.hookMessage}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Barcode & Perforation Graphic */}
                  <div className="mt-5 border-t border-dashed border-[#a8a29e] pt-3 text-center">
                    <div className="mx-auto h-8 w-44 tracking-[4px] font-mono text-base font-bold text-[#374151] select-none">
                      |||| | ||| || |||||| | |||| ||| ||
                    </div>
                    <span className="text-[9px] text-[#6b7280]">
                      NO RECEIPT, NO DONE · FRANK v0.2.0
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Bar below the printed paper */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => triggerPrint()}
                className="flex items-center gap-2 rounded-lg border border-[#1f2738] bg-[#0c1018] px-4 py-2 font-mono text-xs text-[#8c96ab] transition-colors hover:border-[#10b981]/50 hover:text-[#f1f4fa]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Re-print Receipt</span>
              </button>

              <button
                onClick={handleCopyReceipt}
                className="flex items-center gap-2 rounded-lg border border-[#10b981]/40 bg-[#10b981]/10 px-4 py-2 font-mono text-xs font-semibold text-[#10b981] transition-all hover:bg-[#10b981]/20"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
