"use client";

import Image from "next/image";
import { ExternalLink, Heart, Terminal } from "lucide-react";
import { GithubIcon } from "@/components/Icons";
import { sfx } from "@/lib/sound";

export default function Footer() {
  return (
    <footer className="border-t border-[#1f2738] bg-[#06080d] py-16 font-mono text-xs text-[#8c96ab]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-[#171d2b] pb-10">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <Image
                src="/assets/logo.svg"
                alt="Frank logo"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <span className="text-sm font-bold text-[#f1f4fa]">Frank</span>
              <p className="text-[11px] text-[#4b556b]">frank.himanshujangir.com</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com/HimanshuJ16/frank"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sfx.playClick()}
              className="flex items-center gap-1.5 transition-colors hover:text-[#10b981]"
            >
              <GithubIcon className="h-4 w-4" />
              <span>GitHub</span>
            </a>
            <a
              href="https://www.npmjs.com/package/@himanshujangir/frank"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sfx.playClick()}
              className="flex items-center gap-1.5 transition-colors hover:text-[#10b981]"
            >
              <span>npm</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://github.com/HimanshuJ16/frank/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sfx.playClick()}
              className="transition-colors hover:text-[#10b981]"
            >
              MIT License
            </a>
          </div>
        </div>

        {/* Philosophy & Attribution */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-[#f1f4fa]">
              frank, <span className="italic text-[#10b981]">adj.</span> Open, honest and direct, without concealment.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-[#4b556b]">
              Can I use it with Ponytail and Caveman? Yes. Ponytail shrinks what the agent builds, caveman shrinks what it says, Frank makes what it says true.
            </p>
          </div>

          <div className="sm:text-right flex flex-col sm:items-end justify-between">
            <div className="flex items-center gap-2 text-xs text-[#10b981]">
              <Terminal className="h-3.5 w-3.5" />
              <span>~/frank ❯ verdict_attached</span>
              <span className="animate-cursor">▋</span>
            </div>

            <p className="mt-3 text-[11px] text-[#4b556b]">
              Built by{" "}
              <a
                href="https://github.com/HimanshuJ16"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8c96ab] underline hover:text-[#10b981]"
              >
                Himanshu Jangir
              </a>
              . All benchmark charts generated from run logs.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
