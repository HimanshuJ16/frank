"use client";

import { useState } from "react";
import { Terminal, Copy, Check, Play } from "lucide-react";
import { sfx } from "@/lib/sound";

interface CommandItem {
  cmd: string;
  args?: string;
  desc: string;
  simulatedOutput: string;
}

const COMMANDS: CommandItem[] = [
  {
    cmd: "/frank",
    args: "[lite | full | ultra | off]",
    desc: "Set the intensity level. Invoked with no argument reports the current mode and its source.",
    simulatedOutput: `FRANK:FULL (set by plugin configuration)
Rules injected: turn & subagents
Stop hook gate: active (1 turn cap before refusal)
To switch: /frank ultra`,
  },
  {
    cmd: "/frank-verify",
    args: "",
    desc: "Inspect git diff, find and execute the exact test suite for the last edit, and write the receipt.",
    simulatedOutput: `running: pytest tests/api/routes/test_items.py -q
result: 15 passed, 21 warnings in 1.10s
receipt appended to session ledger.`,
  },
  {
    cmd: "/frank-review",
    args: "[target]",
    desc: "Scan a transcript, diff, or PR description for sycophantic openers, unverified claims, and caves.",
    simulatedOutput: `Scan results (4 turns checked):
Turn 2: Caught opener "You're absolutely right!" -> Rewritten to HOLD.
Turn 4: Claim "all tests pass" lacked ledger receipt -> Flagged.`,
  },
  {
    cmd: "/frank-stats",
    args: "",
    desc: "Report what Frank has caught: receipts demanded, contradictions prevented, flattery struck.",
    simulatedOutput: `Frank Session Ledger:
Receipts demanded: 14
Contradictions blocked: 2
Flattery openers prevented: 19
Exit code agreement: 100% (re-run verified)`,
  },
  {
    cmd: "/frank-help",
    args: "",
    desc: "Display quick command reference and rule enforcement parameters.",
    simulatedOutput: `Frank v0.2.1 - Honest Senior Dev Mode
Commands: /frank, /frank-verify, /frank-review, /frank-stats, /frank-help
Repository: https://github.com/HimanshuJ16/frank`,
  },
];

export default function CommandsTable() {
  const [activeCmd, setActiveCmd] = useState<CommandItem>(COMMANDS[0]);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleSelect = (c: CommandItem) => {
    sfx.playClick(650);
    setActiveCmd(c);
  };

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    sfx.playSuccess();
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <section className="border-b border-[#1f2738] bg-[#07090e] py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="font-mono text-xs font-semibold text-[#10b981]">// command_reference</span>
          <h2 className="mt-1 font-mono text-3xl sm:text-4xl font-bold text-[#f1f4fa]">
            Drive It From Chat
          </h2>
          <p className="mt-2 font-mono text-sm text-[#8c96ab]">
            Slash commands available across Claude Code, Codex, Copilot CLI, OpenCode, and Gemini.
          </p>
        </div>

        {/* Interactive Command Browser */}
        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          {/* Left Table / List */}
          <div className="lg:col-span-7 flex flex-col gap-2.5">
            {COMMANDS.map((c) => (
              <button
                key={c.cmd}
                onClick={() => handleSelect(c)}
                className={`flex flex-col text-left rounded-xl border p-4 transition-all ${
                  activeCmd.cmd === c.cmd
                    ? "border-[#10b981] bg-[#0f1522] shadow-lg"
                    : "border-[#1f2738] bg-[#0b0e16] opacity-75 hover:opacity-100 hover:border-[#2b384f]"
                }`}
              >
                <div className="flex items-center justify-between font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#10b981]">{c.cmd}</span>
                    {c.args && <span className="text-xs text-[#8c96ab]">{c.args}</span>}
                  </div>
                  {activeCmd.cmd === c.cmd && (
                    <span className="text-[10px] text-[#38bdf8] flex items-center gap-1">
                      <Play className="h-3 w-3 fill-current" />
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-2 font-mono text-xs text-[#8c96ab] leading-relaxed">
                  {c.desc}
                </p>
              </button>
            ))}
          </div>

          {/* Right Live Simulation Output Box */}
          <div className="lg:col-span-5 flex flex-col rounded-xl border border-[#1f2738] bg-[#0c1018] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1f2738] pb-3">
              <div className="flex items-center gap-2 font-mono text-xs text-[#f1f4fa]">
                <Terminal className="h-3.5 w-3.5 text-[#10b981]" />
                <span className="font-bold">Chat Terminal Output</span>
              </div>

              <button
                onClick={() => handleCopy(activeCmd.cmd)}
                className="flex items-center gap-1 text-[11px] font-mono text-[#8c96ab] hover:text-[#10b981]"
              >
                {copiedCmd === activeCmd.cmd ? (
                  <>
                    <Check className="h-3 w-3 text-[#10b981]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 flex-1 rounded-lg bg-[#06080d] p-4 font-mono text-xs text-[#38bdf8] border border-[#171d2b] leading-relaxed whitespace-pre-wrap">
              <span className="text-[#8c96ab]">❯ {activeCmd.cmd} {activeCmd.args}</span>
              {"\n\n"}
              <span className="text-[#e2e8f0]">{activeCmd.simulatedOutput}</span>
            </div>

            <div className="mt-4 text-[11px] font-mono text-[#4b556b]">
              // Command executes in real time without leaving your chat window.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
