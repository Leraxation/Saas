import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Syncopate } from "next/font/google";
import "./unveil.css";

/**
 * Fonts are self-hosted through next/font so the stage never waits on a
 * third-party request before the first frame.
 */
const display = Syncopate({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nocturne Vespera — The Unveiling",
  description:
    "A scroll-driven unveiling: a grand tourer under silk, pulled back as you scroll, taken apart and put back together in one continuous shot.",
};

export default function UnveilLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${body.variable} ${mono.variable}`}>{children}</div>;
}
