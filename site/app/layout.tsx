import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#07090e",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://frank.himanshujangir.com"),
  title: "Frank - Honest senior dev mode for AI agents",
  description: "He answers first. He shows the receipt. He does not tell you you're right. Verdict first, receipts attached. Works with 20+ AI agents.",
  keywords: [
    "Frank",
    "Himanshu Jangir",
    "AI coding agent",
    "anti-sycophancy",
    "Claude Code",
    "Codex",
    "Cursor",
    "Gemini CLI",
    "receipts",
    "senior dev mode",
    "verified done",
  ],
  authors: [{ name: "Himanshu Jangir", url: "https://github.com/HimanshuJ16" }],
  creator: "Himanshu Jangir",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://frank.himanshujangir.com",
    title: "Frank - Honest senior dev mode for AI agents",
    description: "He answers first. He shows the receipt. He does not tell you you're right. Verdict first, receipts attached.",
    siteName: "Frank",
    images: [
      {
        url: "/assets/logo.svg",
        width: 380,
        height: 400,
        alt: "Frank logo: Honest senior developer holding a verified receipt",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Frank - Honest senior dev mode for AI agents",
    description: "He answers first. He shows the receipt. He does not tell you you're right.",
    images: ["/assets/logo.svg"],
  },
  icons: {
    icon: "/assets/logo.svg",
    apple: "/assets/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${spaceGrotesk.variable} dark scroll-smooth`} suppressHydrationWarning>
      <body className="min-h-screen bg-[#07090e] text-[#f1f4fa] antialiased selection:bg-[#10b981] selection:text-[#07090e]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
