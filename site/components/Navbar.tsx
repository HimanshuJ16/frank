"use client";

import { useState } from "react";
import { Volume2, VolumeX, Terminal, Sparkles } from "lucide-react";
import { GithubIcon } from "@/components/Icons";
import { sfx } from "@/lib/sound";

const FRANK_QUOTES = [
  "You say line 40 is fine. I say line 41 again.",
  "He didn't say you were right. He said the cap covers it.",
  "Run the test. Or write 'unverified:'. Those are the two choices.",
  "I've seen 'it should work' 400 times. Stopped caring around 401.",
  "Light mode? The terminal stays obsidian. Next ticket.",
  "Your agent apologized for being right. Frank doesn't apologize.",
  "The gate handed back your PR. Go run pytest.",
  "Verdict first. Receipts attached. Zero flattery.",
];

export default function Navbar() {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [bubbleVisible, setBubbleVisible] = useState(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sfx.enabled = next;
    if (next) sfx.playSuccess();
  };

  const handleFrankClick = () => {
    sfx.playClick(650);
    setQuoteIndex((prev) => (prev + 1) % FRANK_QUOTES.length);
    setBubbleVisible(true);
    setTimeout(() => {
      setBubbleVisible(false);
    }, 4500);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#1f2738] bg-[#090c13]/90 backdrop-blur-md px-4 py-2.5 text-xs">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        {/* Left: Terminal Window Controls & Context */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f43f5e] opacity-90 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b] opacity-90 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#10b981] opacity-90 inline-block" />
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[#8c96ab] font-mono">
            <span className="text-[#38bdf8]">~/frank</span>
            <span className="text-[#4b556b]">on</span>
            <span className="text-[#a78bfa]">main</span>
            <span className="text-[#4b556b]">·</span>
            <span className="inline-flex items-center gap-1.5 rounded bg-[#10b981]/10 px-2 py-0.5 text-[10px] font-semibold text-[#10b981] border border-[#10b981]/25">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
              FRANK:FULL
            </span>
          </div>
        </div>

        {/* Middle: Anchor Links */}
        <div className="hidden md:flex items-center gap-6 font-mono text-[#8c96ab]">
          <a
            href="#pushback"
            onClick={() => sfx.playClick()}
            className="transition-colors hover:text-[#10b981]"
          >
            // pushback
          </a>
          <a
            href="#receipt-gate"
            onClick={() => sfx.playClick()}
            className="transition-colors hover:text-[#10b981]"
          >
            // receipt-gate
          </a>
          <a
            href="#benchmarks"
            onClick={() => sfx.playClick()}
            className="transition-colors hover:text-[#10b981]"
          >
            // numbers
          </a>
          <a
            href="#modes"
            onClick={() => sfx.playClick()}
            className="transition-colors hover:text-[#10b981]"
          >
            // modes
          </a>
          <a
            href="#install"
            onClick={() => sfx.playClick()}
            className="transition-colors hover:text-[#10b981]"
          >
            // install
          </a>
        </div>

        {/* Right: Sound toggle, Frank quote easter egg, GitHub */}
        <div className="relative flex items-center gap-2">
          {/* Frank Speech Bubble Easter Egg */}
          <div
            className={`absolute right-0 top-10 w-64 rounded-lg border border-[#10b981]/30 bg-[#0f1522] p-3 text-xs text-[#f1f4fa] shadow-2xl transition-all duration-200 z-50 ${
              bubbleVisible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-[#10b981] font-bold">Frank:</span>
              <p className="font-mono text-[11px] leading-relaxed text-[#c6d1e4]">
                &quot;{FRANK_QUOTES[quoteIndex]}&quot;
              </p>
            </div>
            <div className="mt-2 text-right">
              <span className="text-[9px] text-[#4b556b] font-mono">// click again for next</span>
            </div>
          </div>

          <button
            onClick={handleFrankClick}
            title="Ask Frank"
            className="flex items-center gap-1 rounded border border-[#1f2738] bg-[#0e121a] px-2.5 py-1 text-[#8c96ab] transition-all hover:border-[#10b981]/40 hover:text-[#10b981]"
          >
            <Sparkles className="h-3 w-3 text-[#10b981]" />
            <span className="font-mono text-[11px]">frank.say()</span>
          </button>

          <button
            onClick={toggleSound}
            title={soundEnabled ? "Mute audio synthesis" : "Enable tactile sound clicks"}
            className="flex h-7 w-7 items-center justify-center rounded border border-[#1f2738] bg-[#0e121a] text-[#8c96ab] transition-colors hover:border-[#10b981]/40 hover:text-[#10b981]"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-[#10b981]" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          <a
            href="https://github.com/HimanshuJ16/frank"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sfx.playClick()}
            className="flex items-center gap-1.5 rounded border border-[#1f2738] bg-[#0e121a] px-2.5 py-1 font-mono text-[11px] text-[#f1f4fa] transition-colors hover:border-[#10b981]/40 hover:text-[#10b981]"
          >
            <GithubIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
