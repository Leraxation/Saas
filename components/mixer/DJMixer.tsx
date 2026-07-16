"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Deck, { DeckHandle } from "@/components/mixer/Deck";

/** Equal-power crossfade: x is 0 (full A) .. 1 (full B). */
function crossfadeGains(x: number): { a: number; b: number } {
  return {
    a: Math.cos((x * Math.PI) / 2),
    b: Math.sin((x * Math.PI) / 2),
  };
}

const SHORTCUTS: [string, string][] = [
  ["Q", "Deck A play/pause"],
  ["W", "Deck A jump to cue"],
  ["1–4", "Deck A hot cues"],
  ["P", "Deck B play/pause"],
  ["O", "Deck B jump to cue"],
  ["7–0", "Deck B hot cues"],
  ["Z / X / C", "Crossfader A / center / B"],
  ["← / →", "Nudge crossfader"],
];

export default function DJMixer() {
  const deckA = useRef<DeckHandle>(null);
  const deckB = useRef<DeckHandle>(null);

  const [crossfade, setCrossfade] = useState(50); // 0 = full A, 100 = full B
  const [master, setMaster] = useState(100);

  const { a: gainA, b: gainB } = crossfadeGains(crossfade / 100);
  const masterGain = master / 100;

  const sync = useCallback((target: "A" | "B") => {
    const self = target === "A" ? deckA.current : deckB.current;
    const other = target === "A" ? deckB.current : deckA.current;
    if (!self || !other) return;
    const myBpm = self.getBpm();
    const otherBpm = other.getBpm();
    // With tapped BPMs on both decks, match effective BPM; otherwise copy the rate.
    if (myBpm && otherBpm) {
      self.applyRate((otherBpm * other.getRate()) / myBpm);
    } else {
      self.applyRate(other.getRate());
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        el.tagName === "TEXTAREA" ||
        (el.tagName === "INPUT" && (el as HTMLInputElement).type !== "range")
      ) {
        return;
      }
      switch (e.key.toLowerCase()) {
        case "q": deckA.current?.playPause(); break;
        case "w": deckA.current?.jumpToCue(); break;
        case "p": deckB.current?.playPause(); break;
        case "o": deckB.current?.jumpToCue(); break;
        case "1": deckA.current?.triggerHotCue(0); break;
        case "2": deckA.current?.triggerHotCue(1); break;
        case "3": deckA.current?.triggerHotCue(2); break;
        case "4": deckA.current?.triggerHotCue(3); break;
        case "7": deckB.current?.triggerHotCue(0); break;
        case "8": deckB.current?.triggerHotCue(1); break;
        case "9": deckB.current?.triggerHotCue(2); break;
        case "0": deckB.current?.triggerHotCue(3); break;
        case "z": setCrossfade(0); break;
        case "x": setCrossfade(50); break;
        case "c": setCrossfade(100); break;
        case "arrowleft":
          if (el.tagName !== "INPUT") {
            e.preventDefault();
            setCrossfade((v) => Math.max(0, v - 5));
          }
          break;
        case "arrowright":
          if (el.tagName !== "INPUT") {
            e.preventDefault();
            setCrossfade((v) => Math.min(100, v + 5));
          }
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_40%_at_20%_0%,rgba(34,211,238,0.08),transparent),radial-gradient(60%_40%_at_80%_0%,rgba(232,121,249,0.08),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              <span className="text-cyan-300">DJ</span>
              <span className="text-zinc-100"> Mixer</span>
              <span className="ml-3 rounded-full border border-zinc-700 px-2.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                YouTube · Dual Deck
              </span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Paste any YouTube or Shorts link on each deck, then blend with the crossfader.
            </p>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <Deck ref={deckA} label="A" accent="cyan" gain={gainA * masterGain} onSyncRequest={() => sync("A")} />
          <Deck ref={deckB} label="B" accent="fuchsia" gain={gainB * masterGain} onSyncRequest={() => sync("B")} />
        </div>

        {/* Mixer strip */}
        <section
          className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 backdrop-blur"
          aria-label="Mixer"
        >
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span className={crossfade < 50 ? "text-cyan-300" : "text-zinc-600"}>DECK A</span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                  Crossfader
                </span>
                <span className={crossfade > 50 ? "text-fuchsia-300" : "text-zinc-600"}>DECK B</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={crossfade}
                onChange={(e) => setCrossfade(parseInt(e.target.value, 10))}
                className="fader fader-lg w-full"
                style={{ "--fader-color": "#a1a1aa" } as React.CSSProperties}
                aria-label="Crossfader"
              />
              <div className="mt-1 flex justify-between text-[10px] tabular-nums text-zinc-600">
                <span>A {Math.round(crossfadeGains(crossfade / 100).a * 100)}%</span>
                <button
                  onClick={() => setCrossfade(50)}
                  className="rounded px-2 text-zinc-500 hover:text-zinc-300"
                >
                  center
                </button>
                <span>B {Math.round(crossfadeGains(crossfade / 100).b * 100)}%</span>
              </div>
            </div>

            <div className="flex items-center gap-3 md:w-64">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">Master</span>
              <input
                type="range"
                min={0}
                max={100}
                value={master}
                onChange={(e) => setMaster(parseInt(e.target.value, 10))}
                className="fader flex-1"
                style={{ "--fader-color": "#fbbf24" } as React.CSSProperties}
                aria-label="Master volume"
              />
              <span className="w-8 text-right text-xs tabular-nums text-zinc-400">{master}</span>
            </div>
          </div>
        </section>

        <footer className="mt-4 flex flex-wrap gap-x-5 gap-y-1 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-3">
          {SHORTCUTS.map(([key, desc]) => (
            <span key={key} className="text-[11px] text-zinc-500">
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                {key}
              </kbd>{" "}
              {desc}
            </span>
          ))}
        </footer>
      </div>
    </div>
  );
}
