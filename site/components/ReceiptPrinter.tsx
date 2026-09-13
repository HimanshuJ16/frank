"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Printer, AlertOctagon, CheckCircle2, Copy, Check, RotateCcw, Scissors, Sparkles } from "lucide-react";
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
    id: "verified-pass",
    name: "Verified Test Suite (Ledger Proof)",
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
    id: "unverified-fail",
    name: "Claimed Done Without Running Tests",
    claim: "I have resolved the issue with the user authentication session and all endpoints are functional now.",
    lastEdit: "src/auth/session.py (edited 2 mins ago)",
    ledger: "No verification commands run since last edit",
    outcome: "rejected",
    hookMessage: "Gate rejected: Claimed 'functional' but nothing ran after the last edit. Run the test, or write 'unverified:'.",
  },
  {
    id: "unverified-honest",
    name: "Honest 'unverified:' Disclosure",
    claim: "unverified: no test environment configured for third-party Stripe signature verification.\nEndpoint constructed to v2024 spec.",
    lastEdit: "api/webhooks/stripe.ts (edited 1 min ago)",
    ledger: "No local stripe listener active",
    outcome: "unverified_pass",
    hookMessage: "Gate passed: Honest disclosure accepted. Frank demands truth, not hallucinated passes.",
  },
];

// Clean vector barcode that never wraps or collides with typography
function BarcodeSvg() {
  return (
    <div className="flex flex-col items-center">
      <svg
        className="h-8 w-48 text-[#1f2937] max-w-full"
        viewBox="0 0 200 30"
        fill="currentColor"
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width="3" height="30" />
        <rect x="5" y="0" width="1" height="30" />
        <rect x="8" y="0" width="4" height="30" />
        <rect x="15" y="0" width="2" height="30" />
        <rect x="19" y="0" width="1" height="30" />
        <rect x="23" y="0" width="5" height="30" />
        <rect x="31" y="0" width="2" height="30" />
        <rect x="35" y="0" width="3" height="30" />
        <rect x="41" y="0" width="1" height="30" />
        <rect x="45" y="0" width="4" height="30" />
        <rect x="52" y="0" width="2" height="30" />
        <rect x="57" y="0" width="6" height="30" />
        <rect x="66" y="0" width="1" height="30" />
        <rect x="69" y="0" width="3" height="30" />
        <rect x="75" y="0" width="2" height="30" />
        <rect x="79" y="0" width="4" height="30" />
        <rect x="86" y="0" width="1" height="30" />
        <rect x="89" y="0" width="5" height="30" />
        <rect x="97" y="0" width="2" height="30" />
        <rect x="102" y="0" width="3" height="30" />
        <rect x="108" y="0" width="1" height="30" />
        <rect x="112" y="0" width="4" height="30" />
        <rect x="119" y="0" width="2" height="30" />
        <rect x="124" y="0" width="5" height="30" />
        <rect x="132" y="0" width="1" height="30" />
        <rect x="136" y="0" width="3" height="30" />
        <rect x="141" y="0" width="4" height="30" />
        <rect x="148" y="0" width="2" height="30" />
        <rect x="153" y="0" width="1" height="30" />
        <rect x="157" y="0" width="5" height="30" />
        <rect x="165" y="0" width="2" height="30" />
        <rect x="169" y="0" width="3" height="30" />
        <rect x="175" y="0" width="1" height="30" />
        <rect x="179" y="0" width="4" height="30" />
        <rect x="186" y="0" width="2" height="30" />
        <rect x="191" y="0" width="4" height="30" />
        <rect x="197" y="0" width="3" height="30" />
      </svg>
      <span className="mt-1.5 text-[9px] tracking-wider text-[#4b5563] font-mono font-semibold uppercase">
        NO RECEIPT, NO DONE · FRANK v0.2.0
      </span>
    </div>
  );
}

// Vector zigzag sawtooth edge that seamlessly matches the receipt paper
function SawtoothEdge() {
  return (
    <div className="w-full overflow-hidden leading-none -mt-px select-none">
      <svg
        className="w-full h-3 text-[#faf8f2] block"
        viewBox="0 0 120 8"
        preserveAspectRatio="none"
      >
        <polygon
          points="
            0,0 120,0 120,2 
            117,7 114,2 111,7 108,2 105,7 102,2 99,7 96,2 93,7 90,2 87,7 84,2 81,7 78,2 75,7 72,2 
            69,7 66,2 63,7 60,2 57,7 54,2 51,7 48,2 45,7 42,2 39,7 36,2 33,7 30,2 27,7 24,2 
            21,7 18,2 15,7 12,2 9,7 6,2 3,7 0,2
          "
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export default function ReceiptPrinter() {
  const [selectedPreset, setSelectedPreset] = useState<PresetClaim>(PRESETS[0]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printKey, setPrintKey] = useState(0);
  const [stampRevealed, setStampRevealed] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isTorn, setIsTorn] = useState(false);

  const triggerPrint = (preset = selectedPreset) => {
    setIsTorn(false);
    setIsPrinting(true);
    setStampRevealed(false);
    setPrintKey((k) => k + 1);
    sfx.playReceiptPrint();

    // After feed duration (800ms), reveal the stamp with tactile thud
    setTimeout(() => {
      setIsPrinting(false);
      setStampRevealed(true);
      const isSuccess = preset.outcome === "verified";
      sfx.playStamp(isSuccess);

      if (isSuccess) {
        sfx.playSuccess();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.65 },
          colors: ["#10b981", "#38bdf8", "#f59e0b"],
        });
      }
    }, 850);
  };

  const handleSelect = (preset: PresetClaim) => {
    sfx.playClick(800);
    setSelectedPreset(preset);
    triggerPrint(preset);
  };

  const handleTear = () => {
    sfx.playClick(900);
    setIsTorn(true);
    setTimeout(() => {
      triggerPrint();
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
                  ? "border-[#10b981] bg-[#10b981]/15 text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.2)] font-semibold"
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
          {/* Printer Outer Wrapper */}
          <div className="relative w-full max-w-lg">
            {/* Printer Hardware Chassis (The Machine Head) */}
            <div className="relative z-30 w-full rounded-t-xl border border-[#26324a] bg-linear-to-b from-[#18202f] via-[#121722] to-[#0c1017] p-4 shadow-2xl">
              <div className="flex items-center justify-between font-mono text-xs text-[#8c96ab]">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                      isPrinting
                        ? "bg-[#f59e0b] animate-ping"
                        : selectedPreset.outcome === "verified"
                        ? "bg-[#10b981]"
                        : "bg-[#f43f5e]"
                    }`}
                  />
                  <span className="font-bold text-[#f1f4fa]">
                    FRANK HARDWARE LEDGER v0.2.0
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-[#38bdf8]">
                    {isPrinting ? "PRINTING FEED..." : "HOOK: Stop / SubagentStop"}
                  </span>
                </div>
              </div>

              {/* The Recessed Extruder Slit */}
              <div className="relative mt-3 h-4 w-full rounded bg-[#030508] border border-[#1a2232] shadow-[inset_0_3px_6px_rgba(0,0,0,0.95)] flex items-center justify-center overflow-hidden">
                <div className="h-0.5 w-11/12 bg-[#090d14] rounded-full opacity-60" />
              </div>
            </div>

            {/* Extruder Container: The paper physically emerges downwards from the slit */}
            <div className="relative z-10 -mt-2 overflow-hidden px-4 pt-2">
              <AnimatePresence mode="wait">
                {!isTorn && (
                  <motion.div
                    key={printKey}
                    initial={{ y: -60, clipPath: "inset(0% 0% 100% 0%)", opacity: 0.8 }}
                    animate={{ y: 0, clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
                    exit={{ x: 140, rotate: 6, opacity: 0, transition: { duration: 0.3 } }}
                    transition={{
                      duration: 0.85,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`receipt-paper mx-auto w-full max-w-md text-left font-mono shadow-2xl transition-colors ${
                      selectedPreset.outcome === "rejected" ? "border-t-4 border-[#f43f5e]" : "border-t-4 border-[#10b981]"
                    }`}
                  >
                    <div className="p-6">
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
                        <p className="mt-0.5 rounded bg-[#ece7da] p-2.5 text-[11px] font-medium leading-relaxed whitespace-pre-wrap">
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

                      {/* Tactile Gate Decision Stamp */}
                      <div className="mt-4 min-h-21.5">
                        {stampRevealed && (
                          <motion.div
                            initial={{ scale: 1.35, opacity: 0, rotate: -2 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 22,
                            }}
                            className="rounded border p-3"
                          >
                            {selectedPreset.outcome === "verified" ? (
                              <div className="border border-[#10b981] bg-[#eefbf4] p-3 rounded text-center">
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
                              <div className="border border-[#f43f5e] bg-[#fef2f2] p-3 rounded text-center">
                                <div className="flex items-center justify-center gap-1.5 font-bold text-[#b91c1c] text-xs">
                                  <AlertOctagon className="h-4 w-4 text-[#dc2626]" />
                                  <span>GATE: REJECTED (INTERCEPTED TURN)</span>
                                </div>
                                <p className="mt-1.5 text-[11px] text-[#991b1b] leading-tight">
                                  {selectedPreset.hookMessage}
                                </p>
                              </div>
                            ) : (
                              <div className="border border-[#f59e0b] bg-[#fffbeb] p-3 rounded text-center">
                                <div className="flex items-center justify-center gap-1.5 font-bold text-[#b45309] text-xs">
                                  <CheckCircle2 className="h-4 w-4 text-[#d97706]" />
                                  <span>GATE: PASSED (HONEST UNVERIFIED PASS)</span>
                                </div>
                                <p className="mt-1.5 text-[11px] text-[#92400e] leading-tight">
                                  {selectedPreset.hookMessage}
                                </p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>

                      {/* Vector Barcode (No font collisions!) */}
                      <div className="mt-6 border-t border-dashed border-[#a8a29e] pt-4">
                        <BarcodeSvg />
                      </div>
                    </div>

                    {/* Vector Sawtooth Serrated Tear Bottom Edge */}
                    <SawtoothEdge />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Bar below the printed paper */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => triggerPrint()}
                className="flex items-center gap-2 rounded-lg border border-[#1f2738] bg-[#0c1018] px-4 py-2 font-mono text-xs text-[#8c96ab] transition-colors hover:border-[#10b981]/50 hover:text-[#f1f4fa]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Feed New Receipt</span>
              </button>

              <button
                onClick={handleTear}
                className="flex items-center gap-2 rounded-lg border border-[#1f2738] bg-[#0c1018] px-4 py-2 font-mono text-xs text-[#8c96ab] transition-colors hover:border-[#f59e0b]/50 hover:text-[#f59e0b]"
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>Tear Receipt</span>
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
