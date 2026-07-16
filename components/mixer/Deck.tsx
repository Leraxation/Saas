"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { formatTime, loadYouTubeApi, parseYouTubeUrl } from "@/lib/youtube";

export interface DeckHandle {
  playPause: () => void;
  jumpToCue: () => void;
  setCuePoint: () => void;
  triggerHotCue: (index: number) => void;
  getRate: () => number;
  getBpm: () => number | null;
  applyRate: (rate: number) => void;
}

interface DeckProps {
  label: "A" | "B";
  accent: "cyan" | "fuchsia";
  /** Combined crossfader × master gain, 0..1. Deck fader is applied on top. */
  gain: number;
  onRateChange?: (rate: number) => void;
  onSyncRequest?: () => void;
}

const RATE_MIN = 0.25;
const RATE_MAX = 2;
const HOT_CUE_COUNT = 4;

const ACCENTS = {
  cyan: {
    ring: "ring-cyan-400/60",
    text: "text-cyan-300",
    softText: "text-cyan-400/70",
    bg: "bg-cyan-500",
    bgSoft: "bg-cyan-500/15",
    border: "border-cyan-400/30",
    glow: "shadow-[0_0_24px_rgba(34,211,238,0.35)]",
    fader: "#22d3ee",
  },
  fuchsia: {
    ring: "ring-fuchsia-400/60",
    text: "text-fuchsia-300",
    softText: "text-fuchsia-400/70",
    bg: "bg-fuchsia-500",
    bgSoft: "bg-fuchsia-500/15",
    border: "border-fuchsia-400/30",
    glow: "shadow-[0_0_24px_rgba(232,121,249,0.35)]",
    fader: "#e879f9",
  },
} as const;

const Deck = forwardRef<DeckHandle, DeckProps>(function Deck(
  { label, accent, gain, onRateChange, onSyncRequest },
  ref
) {
  const c = ACCENTS[accent];

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const playerReadyRef = useRef(false);

  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(90);
  const [rate, setRate] = useState(1);

  const [cuePoint, setCuePoint] = useState<number | null>(null);
  const [hotCues, setHotCues] = useState<(number | null)[]>(Array(HOT_CUE_COUNT).fill(null));
  const [loopIn, setLoopIn] = useState<number | null>(null);
  const [loopOut, setLoopOut] = useState<number | null>(null);
  const [loopActive, setLoopActive] = useState(false);

  const [bpm, setBpm] = useState<number | null>(null);
  const tapsRef = useRef<number[]>([]);

  // Loop values mirrored into a ref so the polling interval reads fresh values.
  const loopRef = useRef({ active: false, in: 0, out: 0 });
  useEffect(() => {
    loopRef.current = {
      active: loopActive && loopIn !== null && loopOut !== null && loopOut > loopIn,
      in: loopIn ?? 0,
      out: loopOut ?? 0,
    };
  }, [loopActive, loopIn, loopOut]);

  // Volume: deck fader × crossfader/master gain.
  useEffect(() => {
    if (playerReadyRef.current) {
      playerRef.current?.setVolume(Math.round(volume * gain));
    }
  }, [volume, gain, videoId]);

  // Poll playback position (also drives the loop).
  useEffect(() => {
    const id = setInterval(() => {
      const player = playerRef.current;
      if (!player || !playerReadyRef.current) return;
      try {
        const t = player.getCurrentTime();
        setCurrent(t);
        const d = player.getDuration();
        if (d > 0) setDuration(d);
        const loop = loopRef.current;
        if (loop.active && t >= loop.out) player.seekTo(loop.in, true);
      } catch {
        // Player can briefly be in a torn-down state while loading a new video.
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => playerRef.current?.destroy(), []);

  const resetTrackState = useCallback(() => {
    setCuePoint(null);
    setHotCues(Array(HOT_CUE_COUNT).fill(null));
    setLoopIn(null);
    setLoopOut(null);
    setLoopActive(false);
    setBpm(null);
    tapsRef.current = [];
    setCurrent(0);
    setDuration(0);
    setPlaying(false);
    setTitle("");
    setAuthor("");
  }, []);

  const loadUrl = useCallback(async () => {
    const parsed = parseYouTubeUrl(url);
    if (!parsed) {
      setError("That doesn't look like a YouTube link. Paste a watch, youtu.be or Shorts URL.");
      return;
    }
    setError(null);
    resetTrackState();
    setVideoId(parsed.id);

    try {
      const YTApi = await loadYouTubeApi();
      if (playerRef.current) {
        playerRef.current.cueVideoById({ videoId: parsed.id, startSeconds: parsed.startSeconds });
        return;
      }
      if (!containerRef.current) return;
      playerRef.current = new YTApi.Player(containerRef.current, {
        width: "100%",
        height: "100%",
        videoId: parsed.id,
        playerVars: {
          controls: 0,
          disablekb: 1,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          iv_load_policy: 3,
          start: parsed.startSeconds,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            playerReadyRef.current = true;
            e.target.setVolume(Math.round(volume * gain));
          },
          onStateChange: (e) => {
            setPlaying(e.data === YTApi.PlayerState.PLAYING);
            if (e.data === YTApi.PlayerState.CUED || e.data === YTApi.PlayerState.PLAYING) {
              const data = e.target.getVideoData();
              setTitle(data.title);
              setAuthor(data.author);
            }
          },
          onPlaybackRateChange: (e) => {
            setRate(e.data);
            onRateChange?.(e.data);
          },
          onError: () => {
            setError("This video can't be played here (unavailable or embedding disabled).");
          },
        },
      });
    } catch {
      setError("Couldn't load the YouTube player. Check your connection and try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, resetTrackState]);

  const playPause = useCallback(() => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current) return;
    if (player.getPlayerState() === 1) player.pauseVideo();
    else player.playVideo();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(Math.max(0, seconds), true);
    setCurrent(seconds);
  }, []);

  const setCuePointHere = useCallback(() => {
    if (playerReadyRef.current) setCuePoint(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const jumpToCue = useCallback(() => {
    if (cuePoint !== null) seekTo(cuePoint);
  }, [cuePoint, seekTo]);

  const triggerHotCue = useCallback(
    (index: number) => {
      if (!playerReadyRef.current) return;
      setHotCues((prev) => {
        const existing = prev[index];
        if (existing === null) {
          const next = [...prev];
          next[index] = current;
          return next;
        }
        seekTo(existing);
        return prev;
      });
    },
    [current, seekTo]
  );

  const clearHotCue = useCallback((index: number) => {
    setHotCues((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, []);

  const applyRate = useCallback(
    (value: number) => {
      const clamped = Math.min(RATE_MAX, Math.max(RATE_MIN, value));
      setRate(clamped);
      playerRef.current?.setPlaybackRate(clamped);
      onRateChange?.(clamped);
    },
    [onRateChange]
  );

  const nudgeRef = useRef<number | null>(null);
  const beginNudge = useCallback(
    (delta: number) => {
      if (nudgeRef.current !== null) return;
      nudgeRef.current = rate;
      playerRef.current?.setPlaybackRate(Math.min(RATE_MAX, Math.max(RATE_MIN, rate + delta)));
    },
    [rate]
  );
  const endNudge = useCallback(() => {
    if (nudgeRef.current === null) return;
    playerRef.current?.setPlaybackRate(nudgeRef.current);
    nudgeRef.current = null;
  }, []);

  const tapBpm = useCallback(() => {
    const now = performance.now();
    const taps = tapsRef.current;
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) taps.length = 0;
    taps.push(now);
    if (taps.length > 8) taps.shift();
    if (taps.length >= 4) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setBpm(Math.round((60000 / avg) * 10) / 10);
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      playPause,
      jumpToCue,
      setCuePoint: setCuePointHere,
      triggerHotCue,
      getRate: () => rate,
      getBpm: () => bpm,
      applyRate,
    }),
    [playPause, jumpToCue, setCuePointHere, triggerHotCue, rate, bpm, applyRate]
  );

  const loopLength = loopIn !== null && loopOut !== null ? loopOut - loopIn : null;
  const resizeLoop = useCallback(
    (factor: number) => {
      if (loopIn === null || loopOut === null) return;
      const next = loopIn + (loopOut - loopIn) * factor;
      if (next - loopIn >= 0.2 && next <= duration) setLoopOut(next);
    },
    [loopIn, loopOut, duration]
  );

  const tempoPercent = ((rate - 1) * 100).toFixed(0);
  const effectiveBpm = bpm !== null ? Math.round(bpm * rate * 10) / 10 : null;

  return (
    <section
      className={`flex flex-col gap-4 rounded-2xl border ${c.border} bg-zinc-900/80 p-4 backdrop-blur`}
      aria-label={`Deck ${label}`}
    >
      {/* Header: deck badge + URL loader */}
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.bgSoft} ${c.text} text-sm font-bold`}
        >
          {label}
        </span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadUrl()}
          placeholder="Paste a YouTube / Shorts link…"
          className={`min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:ring-2 ${c.ring}`}
        />
        <button
          onClick={loadUrl}
          className={`shrink-0 rounded-lg ${c.bg} px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:brightness-110`}
        >
          Load
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {/* Screen + platter */}
      <div className="flex gap-4">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <div className="aspect-video w-full">
            <div ref={containerRef} className="pointer-events-none h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
            {!videoId && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">
                No track loaded
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center gap-2">
          <div
            className={`relative h-24 w-24 rounded-full border-4 border-zinc-800 bg-zinc-950 bg-cover bg-center ${
              playing ? `animate-[spin_2s_linear_infinite] ${c.glow}` : ""
            }`}
            style={
              videoId
                ? { backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)` }
                : undefined
            }
            aria-hidden="true"
          >
            <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-zinc-700 bg-zinc-900" />
          </div>
          <span className={`text-[10px] uppercase tracking-widest ${playing ? c.text : "text-zinc-600"}`}>
            {playing ? "Playing" : "Stopped"}
          </span>
        </div>
      </div>

      {/* Track info */}
      <div className="min-h-[2.25rem]">
        <p className="truncate text-sm font-semibold text-zinc-100">{title || "—"}</p>
        <p className="truncate text-xs text-zinc-500">{author}</p>
      </div>

      {/* Seek */}
      <div>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={0.1}
          value={Math.min(current, duration || 0)}
          onChange={(e) => seekTo(parseFloat(e.target.value))}
          disabled={!videoId}
          className="fader w-full"
          style={{ "--fader-color": c.fader } as React.CSSProperties}
          aria-label={`Deck ${label} seek`}
        />
        <div className="flex justify-between text-[11px] tabular-nums text-zinc-500">
          <span className={c.text}>{formatTime(current)}</span>
          <span>-{formatTime(Math.max(duration - current, 0))}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Transport */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={playPause}
          disabled={!videoId}
          className={`col-span-2 rounded-xl py-3 text-sm font-bold transition disabled:opacity-40 ${
            playing ? "bg-zinc-800 text-zinc-200" : `${c.bg} text-zinc-950 hover:brightness-110`
          }`}
        >
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button
          onClick={jumpToCue}
          disabled={cuePoint === null}
          className="rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-40"
          title={cuePoint !== null ? `Cue @ ${formatTime(cuePoint)}` : "No cue set"}
        >
          Cue
        </button>
        <button
          onClick={setCuePointHere}
          disabled={!videoId}
          className="rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-400 transition hover:bg-zinc-800 disabled:opacity-40"
        >
          Set Cue
        </button>
      </div>

      {/* Hot cues */}
      <div className="grid grid-cols-4 gap-2">
        {hotCues.map((cue, i) => (
          <div key={i} className="relative">
            <button
              onClick={() => triggerHotCue(i)}
              disabled={!videoId}
              className={`w-full rounded-lg py-2 text-xs font-semibold transition disabled:opacity-40 ${
                cue !== null
                  ? `${c.bgSoft} ${c.text} border ${c.border}`
                  : "border border-dashed border-zinc-700 text-zinc-500 hover:bg-zinc-800"
              }`}
            >
              {cue !== null ? formatTime(cue) : `Cue ${i + 1}`}
            </button>
            {cue !== null && (
              <button
                onClick={() => clearHotCue(i)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[9px] text-zinc-300 hover:bg-red-500"
                aria-label={`Clear hot cue ${i + 1}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Loop */}
      <div className="flex items-center gap-2">
        <span className="w-10 text-[10px] uppercase tracking-widest text-zinc-500">Loop</span>
        <button
          onClick={() => setLoopIn(current)}
          disabled={!videoId}
          className="flex-1 rounded-lg border border-zinc-700 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
        >
          In {loopIn !== null && <span className={c.softText}>{formatTime(loopIn)}</span>}
        </button>
        <button
          onClick={() => {
            if (loopIn !== null && current > loopIn) {
              setLoopOut(current);
              setLoopActive(true);
            }
          }}
          disabled={loopIn === null}
          className="flex-1 rounded-lg border border-zinc-700 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
        >
          Out {loopOut !== null && <span className={c.softText}>{formatTime(loopOut)}</span>}
        </button>
        <button
          onClick={() => resizeLoop(0.5)}
          disabled={!loopActive}
          className="rounded-lg border border-zinc-700 px-2 py-2 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
          title="Halve loop length"
        >
          ½×
        </button>
        <button
          onClick={() => resizeLoop(2)}
          disabled={!loopActive}
          className="rounded-lg border border-zinc-700 px-2 py-2 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
          title="Double loop length"
        >
          2×
        </button>
        <button
          onClick={() => setLoopActive((a) => !a)}
          disabled={loopIn === null || loopOut === null}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition disabled:opacity-40 ${
            loopActive ? `${c.bg} text-zinc-950` : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          {loopActive ? `Looping ${loopLength !== null ? `${loopLength.toFixed(1)}s` : ""}` : "Loop Off"}
        </button>
      </div>

      {/* Tempo + BPM */}
      <div className="flex items-center gap-3">
        <span className="w-10 text-[10px] uppercase tracking-widest text-zinc-500">Tempo</span>
        <button
          onPointerDown={() => beginNudge(-0.25)}
          onPointerUp={endNudge}
          onPointerLeave={endNudge}
          disabled={!videoId}
          className="rounded-lg border border-zinc-700 px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          title="Pitch bend down (hold)"
        >
          −
        </button>
        <input
          type="range"
          min={RATE_MIN}
          max={RATE_MAX}
          step={0.05}
          value={rate}
          onChange={(e) => applyRate(parseFloat(e.target.value))}
          disabled={!videoId}
          className="fader flex-1"
          style={{ "--fader-color": c.fader } as React.CSSProperties}
          aria-label={`Deck ${label} tempo`}
        />
        <button
          onPointerDown={() => beginNudge(0.25)}
          onPointerUp={endNudge}
          onPointerLeave={endNudge}
          disabled={!videoId}
          className="rounded-lg border border-zinc-700 px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          title="Pitch bend up (hold)"
        >
          +
        </button>
        <button
          onClick={() => applyRate(1)}
          disabled={!videoId}
          className={`w-16 rounded-lg border border-zinc-700 py-1 text-xs tabular-nums ${
            rate === 1 ? "text-zinc-500" : c.text
          } hover:bg-zinc-800 disabled:opacity-40`}
          title="Reset tempo"
        >
          {Number(tempoPercent) > 0 ? "+" : ""}
          {tempoPercent}%
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="w-10 text-[10px] uppercase tracking-widest text-zinc-500">BPM</span>
        <button
          onClick={tapBpm}
          disabled={!videoId}
          className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          title="Tap along with the beat to measure BPM"
        >
          Tap
        </button>
        <span className={`text-sm font-bold tabular-nums ${effectiveBpm !== null ? c.text : "text-zinc-600"}`}>
          {effectiveBpm !== null ? effectiveBpm : "--"}
        </span>
        {bpm !== null && rate !== 1 && (
          <span className="text-[10px] text-zinc-500">(base {bpm})</span>
        )}
        <div className="flex-1" />
        <button
          onClick={onSyncRequest}
          disabled={!videoId}
          className={`rounded-lg ${c.bgSoft} border ${c.border} px-4 py-1 text-xs font-bold ${c.text} transition hover:brightness-125 disabled:opacity-40`}
          title="Match tempo to the other deck"
        >
          Sync
        </button>
      </div>

      {/* Deck volume */}
      <div className="flex items-center gap-3">
        <span className="w-10 text-[10px] uppercase tracking-widest text-zinc-500">Level</span>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value, 10))}
          className="fader flex-1"
          style={{ "--fader-color": c.fader } as React.CSSProperties}
          aria-label={`Deck ${label} volume`}
        />
        <span className="w-8 text-right text-xs tabular-nums text-zinc-400">{volume}</span>
      </div>
    </section>
  );
});

export default Deck;
