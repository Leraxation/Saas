import type { Metadata } from "next";
import DJMixer from "@/components/mixer/DJMixer";

export const metadata: Metadata = {
  title: "DJ Mixer — YouTube Dual Deck",
  description:
    "Advanced dual-deck DJ mixer for YouTube videos and Shorts: crossfader, tempo, hot cues, loops and sync.",
};

export default function MixerPage() {
  return <DJMixer />;
}
