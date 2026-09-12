import type { Metadata } from "next";
import { Amiri, Cinzel, Cormorant_Garamond, Inter } from "next/font/google";
import "./vision.css";

/**
 * Fonts are loaded through next/font, which self-hosts them at build time.
 * That matters here: the presentation must run with the venue Wi-Fi off.
 */
const display = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const ui = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});

const arabic = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oman Vision 2040 — Aviation",
  description:
    "A scroll-driven briefing on the role of the aviation sector in Oman Vision 2040. Muscat, 23 September 2026.",
};

export default function VisionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} ${serif.variable} ${ui.variable} ${arabic.variable}`}>
      {children}
    </div>
  );
}
