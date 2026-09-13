"use client";

import { useState } from "react";
import { Copy, Check, Terminal, Search, Layers, Cpu } from "lucide-react";
import { sfx } from "@/lib/sound";

interface AgentItem {
  name: string;
  category: "gated" | "skills" | "rules";
  tierLabel: string;
  installCommand: string;
  note: string;
}

const AGENTS: AgentItem[] = [
  {
    name: "Claude Code",
    category: "gated",
    tierLabel: "Stop Hook + Gate + Rules",
    installCommand: "/plugin marketplace add HimanshuJ16/frank\n/plugin install frank@frank",
    note: "Asks for mode on first enable. Stop hook inspects final message against session ledger.",
  },
  {
    name: "Codex",
    category: "gated",
    tierLabel: "Stop Hook + Gate + Rules",
    installCommand: "codex plugin marketplace add HimanshuJ16/frank\ncodex plugin add frank@frank",
    note: "Review hooks in /hooks, badge shows FRANK:FULL, skills invoked with @frank.",
  },
  {
    name: "GitHub Copilot CLI",
    category: "gated",
    tierLabel: "Stop Hook + Gate + Rules",
    installCommand: "copilot plugin marketplace add HimanshuJ16/frank\ncopilot plugin install frank@frank",
    note: "Namespaces commands: /frank:frank ultra. Gate runs on agentStop from transcript.",
  },
  {
    name: "OpenCode",
    category: "skills",
    tierLabel: "Rules + Commands",
    installCommand: '{ "plugin": ["@himanshujangir/frank"] }',
    note: "Add to opencode.json. Injects rules every turn and registers /frank commands.",
  },
  {
    name: "Gemini CLI / Antigravity",
    category: "skills",
    tierLabel: "Rules + Commands",
    installCommand: "gemini extensions install https://github.com/HimanshuJ16/frank",
    note: "Always-on system context rules and /frank skills in commands/ directory.",
  },
  {
    name: "Qoder",
    category: "gated",
    tierLabel: "Stop Hook + Gate + Rules",
    installCommand: "Copy hooks/qoder-hooks.json into .qoder/settings.json",
    note: "Reads AGENTS.md with zero setup. Hardware receipts gate supported via settings.json.",
  },
  {
    name: "Devin CLI",
    category: "skills",
    tierLabel: "Skills",
    installCommand: "devin plugins install HimanshuJ16/frank",
    note: "Installs full Frank verification skills into Devin CLI workspace.",
  },
  {
    name: "Grok Build",
    category: "skills",
    tierLabel: "Skills",
    installCommand: "grok plugin install HimanshuJ16/frank --trust",
    note: "Enables Frank verification skills in Grok Build workflows.",
  },
  {
    name: "Cursor",
    category: "rules",
    tierLabel: "Rules Adapter",
    installCommand: "cp frank/.cursor/rules/frank.mdc your-project/.cursor/rules/",
    note: "Always-on system rules: verdict first, receipts attached, hold ground.",
  },
  {
    name: "Windsurf",
    category: "rules",
    tierLabel: "Rules Adapter",
    installCommand: "cp frank/.windsurf/rules/frank.md your-project/.windsurf/rules/",
    note: "Cascades rules throughout every Windsurf turn and edit.",
  },
  {
    name: "Cline",
    category: "rules",
    tierLabel: "Rules Adapter",
    installCommand: "cp frank/.clinerules/frank.md your-project/.clinerules/",
    note: "Injects anti-sycophancy and receipt rules into Cline task prompt.",
  },
  {
    name: "Zed",
    category: "rules",
    tierLabel: "Rules Adapter",
    installCommand: "cp frank/.zed/rules/frank.md your-project/.zed/rules/",
    note: "Works seamlessly in Zed Assistant and edit workflows.",
  },
  {
    name: "Kiro",
    category: "rules",
    tierLabel: "Rules Adapter",
    installCommand: "cp frank/.kiro/steering/frank.md your-project/.kiro/steering/",
    note: "Steers Kiro agents toward verified test runs and calibrated responses.",
  },
  {
    name: "JetBrains Junie",
    category: "rules",
    tierLabel: "Rules Adapter",
    installCommand: "cp frank/.junie/guidelines.md your-project/.junie/guidelines.md",
    note: "Configures Junie guidelines with senior dev honesty constraints.",
  },
  {
    name: "Aider / Amp / Jules",
    category: "rules",
    tierLabel: "Zero Setup (AGENTS.md)",
    installCommand: "cp frank/AGENTS.md your-project/AGENTS.md",
    note: "Automatically reads AGENTS.md from checkout with zero configuration required.",
  },
];

export default function AgentMatrix() {
  const [filter, setFilter] = useState<"all" | "gated" | "skills" | "rules">("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = AGENTS.filter((a) => {
    const matchesCategory = filter === "all" || a.category === filter;
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.note.toLowerCase().includes(search.toLowerCase()) ||
      a.installCommand.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (agent: AgentItem) => {
    navigator.clipboard.writeText(agent.installCommand);
    sfx.playSuccess();
    setCopiedId(agent.name);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="install" className="border-b border-[#1f2738] bg-[#07090e] py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="font-mono text-xs font-semibold text-[#10b981]">// universal_support</span>
          <h2 className="mt-1 font-mono text-3xl sm:text-4xl font-bold text-[#f1f4fa]">
            Works With 20+ AI Agents
          </h2>
          <p className="mt-2 font-mono text-sm text-[#8c96ab]">
            Node hooks where the host supports it, rules files everywhere else. Pick your host.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8c96ab]" />
            <input
              type="text"
              placeholder="Search agent (e.g. Claude, Codex, Cursor)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#1f2738] bg-[#0c1018] pl-9 pr-3 py-2 font-mono text-xs text-[#f1f4fa] placeholder-[#4b556b] focus:border-[#10b981] focus:outline-none"
            />
          </div>

          <div className="flex items-center rounded-lg border border-[#1f2738] bg-[#0d121b] p-1 font-mono text-xs">
            <button
              onClick={() => { sfx.playClick(); setFilter("all"); }}
              className={`rounded px-3 py-1.5 transition-all ${
                filter === "all" ? "bg-[#10b981] text-[#07090e] font-semibold" : "text-[#8c96ab] hover:text-[#f1f4fa]"
              }`}
            >
              All (20)
            </button>
            <button
              onClick={() => { sfx.playClick(); setFilter("gated"); }}
              className={`rounded px-3 py-1.5 transition-all ${
                filter === "gated" ? "bg-[#10b981] text-[#07090e] font-semibold" : "text-[#8c96ab] hover:text-[#10b981]"
              }`}
            >
              Hardware Gated
            </button>
            <button
              onClick={() => { sfx.playClick(); setFilter("skills"); }}
              className={`rounded px-3 py-1.5 transition-all ${
                filter === "skills" ? "bg-[#10b981] text-[#07090e] font-semibold" : "text-[#8c96ab] hover:text-[#10b981]"
              }`}
            >
              Skills & CLI
            </button>
            <button
              onClick={() => { sfx.playClick(); setFilter("rules"); }}
              className={`rounded px-3 py-1.5 transition-all ${
                filter === "rules" ? "bg-[#10b981] text-[#07090e] font-semibold" : "text-[#8c96ab] hover:text-[#10b981]"
              }`}
            >
              Rules Adapters
            </button>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <div
              key={agent.name}
              className="flex flex-col justify-between rounded-xl border border-[#1f2738] bg-[#0b0e16] p-4 font-mono transition-all hover:border-[#10b981]/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#f1f4fa]">{agent.name}</h3>
                  <span
                    className={`rounded px-2 py-0.5 text-[9px] font-semibold ${
                      agent.category === "gated"
                        ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30"
                        : agent.category === "skills"
                        ? "bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30"
                        : "bg-[#8c96ab]/15 text-[#cbd5e1] border border-[#8c96ab]/30"
                    }`}
                  >
                    {agent.tierLabel}
                  </span>
                </div>

                <div className="mt-3 rounded bg-[#06080d] p-2.5 text-xs text-[#38bdf8] border border-[#171d2b] overflow-x-auto whitespace-pre-wrap">
                  <code>{agent.installCommand}</code>
                </div>

                <p className="mt-2.5 text-[11px] text-[#8c96ab] leading-relaxed">
                  {agent.note}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#171e2c] flex justify-end">
                <button
                  onClick={() => handleCopy(agent)}
                  className="flex items-center gap-1.5 rounded border border-[#20293d] bg-[#101522] px-3 py-1 text-[11px] text-[#c6d1e4] transition-colors hover:border-[#10b981]/40 hover:text-[#10b981]"
                >
                  {copiedId === agent.name ? (
                    <>
                      <Check className="h-3 w-3 text-[#10b981]" />
                      <span className="text-[#10b981]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Install</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
