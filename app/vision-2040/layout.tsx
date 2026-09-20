import type { Metadata } from "next";
import "./vision.css";

export const metadata: Metadata = {
  title: "Oman Vision 2040 — Aviation",
  description:
    "A scroll-driven briefing on the role of the aviation sector in Oman Vision 2040. Muscat, 23 September 2026.",
};

export default function VisionLayout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
