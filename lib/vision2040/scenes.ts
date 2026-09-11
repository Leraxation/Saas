/**
 * Canvas scenes for the Vision 2040 stage.
 *
 * Every renderer is a pure function of (ctx, width, height, time, progress).
 * No renderer holds state between frames except through the `Particles`
 * object it is handed, which keeps allocation out of the render loop.
 *
 * Progress (`p`) is the local 0..1 scroll position within that act.
 * Time (`t`) is seconds since mount, used only for ambient motion so the
 * stage never looks frozen when the presenter stops scrolling.
 */

import {
  AIRPORTS,
  DESTINATIONS,
  HUB,
  OMAN_MAINLAND,
  OMAN_MUSANDAM,
  VIEW_OMAN,
  VIEW_REGION,
  arcPoint,
  lerpViewport,
  makeProjector,
  type LonLat,
} from "./geo";
import { GROWTH, PILLARS, ROADMAP } from "./data";
import { clamp01, easeInOut, easeOut, easeOutBack, range } from "./useStage";
import type { QualityTier } from "./useStage";

export const INK = "#04070f";
export const GOLD = "216, 182, 120";
export const GOLD_HI = "240, 220, 174";
export const CYAN = "79, 214, 255";
export const CYAN_HI = "160, 236, 255";

const particleBudget: Record<QualityTier, number> = { high: 260, medium: 150, low: 70 };

export type Mote = { x: number; y: number; z: number; r: number; s: number };

export function makeMotes(n = 300): Mote[] {
  const out: Mote[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: Math.random(),
      y: Math.random(),
      z: 0.25 + Math.random() * 0.75,
      r: 0.4 + Math.random() * 1.7,
      s: 0.2 + Math.random() * 0.9,
    });
  }
  return out;
}

/* ── Backdrop ─────────────────────────────────────────────────────────── */

/**
 * The constant behind everything: a deep night gradient that warms toward
 * the horizon, plus slow drifting motes. `warmth` rises in the acts that
 * should feel like dusk rather than deep night.
 */
export function paintBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  warmth: number,
  motes: Mote[],
  quality: QualityTier,
) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#03060d");
  g.addColorStop(0.45, "#061020");
  g.addColorStop(0.78, `rgba(${Math.round(10 + warmth * 32)}, ${Math.round(20 + warmth * 24)}, ${Math.round(42 + warmth * 6)}, 1)`);
  g.addColorStop(1, `rgba(${Math.round(16 + warmth * 70)}, ${Math.round(24 + warmth * 42)}, ${Math.round(44 - warmth * 4)}, 1)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Horizon glow — the amber band from the reference photograph.
  if (warmth > 0.01) {
    const hg = ctx.createRadialGradient(w * 0.62, h * 1.02, 0, w * 0.62, h * 1.02, h * 0.85);
    hg.addColorStop(0, `rgba(232, 158, 72, ${0.2 * warmth})`);
    hg.addColorStop(0.5, `rgba(190, 110, 60, ${0.07 * warmth})`);
    hg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);
  }

  const n = particleBudget[quality];
  ctx.save();
  for (let i = 0; i < n; i++) {
    const m = motes[i];
    if (!m) break;
    const drift = (t * m.s * 0.012) % 1.2;
    const x = ((m.x + drift) % 1.2) * w - w * 0.1;
    const y = (m.y + Math.sin(t * 0.18 * m.s + i) * 0.012) * h;
    const a = 0.05 + m.z * 0.22;
    ctx.fillStyle = `rgba(${CYAN_HI}, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, m.r * m.z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Vignette + a whisper of grain. Called last, over everything. */
export function paintFinish(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  quality: QualityTier,
) {
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  if (quality === "low") return;
  // Cheap grain: a few hundred faint specks beats a per-pixel pass.
  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 220; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
  ctx.restore();
}

/* ── Act III — the network ────────────────────────────────────────────── */

function strokePath(
  ctx: CanvasRenderingContext2D,
  pts: LonLat[],
  proj: (p: LonLat) => [number, number],
  reveal: number,
) {
  const n = Math.floor(pts.length * clamp01(reveal));
  if (n < 2) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [x, y] = proj(pts[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function fillPath(
  ctx: CanvasRenderingContext2D,
  pts: LonLat[],
  proj: (p: LonLat) => [number, number],
) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = proj(pts[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * The centrepiece. Four movements inside one act:
 *   0.00–0.22  the coastline draws itself
 *   0.18–0.45  domestic airports light in sequence, hub first
 *   0.38–0.62  domestic links knit the governorates together
 *   0.55–1.00  the view pulls back and international arcs bloom outward
 */
export function paintNetwork(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  p: number,
  quality: QualityTier,
) {
  const zoom = easeInOut(range(p, 0.55, 0.92));
  const view = lerpViewport(VIEW_OMAN, VIEW_REGION, zoom);
  const proj = makeProjector(view, w * 0.82, h * 0.82);

  const draw = range(p, 0.0, 0.22);
  const landAlpha = range(p, 0.06, 0.3) * (1 - zoom * 0.45);

  // Landmass wash
  ctx.save();
  ctx.fillStyle = `rgba(${CYAN}, ${0.05 * landAlpha})`;
  fillPath(ctx, OMAN_MAINLAND, proj);
  fillPath(ctx, OMAN_MUSANDAM, proj);

  // Coastline
  ctx.lineWidth = Math.max(1, 1.6 * (1 - zoom * 0.4));
  ctx.strokeStyle = `rgba(${CYAN_HI}, ${0.5 + 0.3 * Math.sin(t * 0.7)})`;
  ctx.shadowColor = `rgba(${CYAN}, 0.8)`;
  ctx.shadowBlur = quality === "low" ? 0 : 14;
  strokePath(ctx, OMAN_MAINLAND, proj, draw);
  if (draw > 0.85) strokePath(ctx, OMAN_MUSANDAM, proj, range(p, 0.16, 0.24));
  ctx.shadowBlur = 0;
  ctx.restore();

  const hub = proj(HUB);

  // Domestic links
  const knit = range(p, 0.38, 0.66);
  if (knit > 0) {
    ctx.save();
    ctx.lineWidth = 1;
    AIRPORTS.forEach((a, i) => {
      if (a.code === "MCT") return;
      const seq = clamp01((knit - (i / AIRPORTS.length) * 0.45) * 2.4);
      if (seq <= 0) return;
      const b = proj(a.lonlat);
      ctx.strokeStyle = `rgba(${CYAN}, ${0.3 * seq * (1 - zoom * 0.6)})`;
      ctx.beginPath();
      const steps = 24;
      for (let s = 0; s <= steps * seq; s++) {
        const [x, y] = arcPoint(hub, b, s / steps, 0.13);
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.restore();
  }

  // Domestic airports
  const light = range(p, 0.18, 0.5);
  AIRPORTS.forEach((a, i) => {
    const order = a.tier === "hub" ? i * 0.3 : 1.2 + i * 0.55;
    const seq = clamp01((light * AIRPORTS.length - order) * 1.1);
    if (seq <= 0) return;
    const [x, y] = proj(a.lonlat);
    const base = a.tier === "hub" ? 4.6 : 2.8;
    const r = base * easeOutBack(seq) * (1 - zoom * 0.5);
    const beat = 0.55 + 0.45 * Math.sin(t * 1.6 + i * 1.3);

    ctx.save();
    ctx.fillStyle = `rgba(${GOLD_HI}, ${0.9 * seq})`;
    ctx.shadowColor = `rgba(${GOLD}, 0.95)`;
    ctx.shadowBlur = quality === "low" ? 0 : 18 * seq;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.6, r), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Halo ring on the hubs
    if (a.tier === "hub" && zoom < 0.7) {
      ctx.strokeStyle = `rgba(${GOLD}, ${0.34 * seq * beat * (1 - zoom)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r + 7 + beat * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });

  // International arcs
  const bloom = range(p, 0.6, 1.0);
  if (bloom > 0) {
    const count = quality === "low" ? 16 : quality === "medium" ? 26 : DESTINATIONS.length;
    ctx.save();
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      const d = DESTINATIONS[i];
      const seq = clamp01((bloom * count - i * 0.62) * 0.7);
      if (seq <= 0) continue;
      const b = proj(d.lonlat);
      const grow = easeOut(seq);

      ctx.strokeStyle = `rgba(${CYAN}, ${0.3 * seq})`;
      ctx.beginPath();
      const steps = quality === "low" ? 18 : 34;
      for (let s = 0; s <= steps * grow; s++) {
        const [x, y] = arcPoint(hub, b, s / steps, 0.2);
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Travelling pulse — the thing that makes it read as traffic, not lines.
      if (grow > 0.98 && quality !== "low") {
        const ph = (t * 0.24 + i * 0.14) % 1;
        const [px, py] = arcPoint(hub, b, ph, 0.2);
        ctx.fillStyle = `rgba(${CYAN_HI}, ${0.9 * (1 - Math.abs(ph - 0.5) * 1.1)})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }

      if (grow > 0.9) {
        ctx.fillStyle = `rgba(${CYAN_HI}, ${0.75 * seq})`;
        ctx.beginPath();
        ctx.arc(b[0], b[1], 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // The hub never stops glowing.
  if (light > 0) {
    const beat = 0.6 + 0.4 * Math.sin(t * 1.9);
    ctx.save();
    const g = ctx.createRadialGradient(hub[0], hub[1], 0, hub[0], hub[1], 46 + beat * 14);
    g.addColorStop(0, `rgba(${GOLD_HI}, ${0.3 * light})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(hub[0] - 70, hub[1] - 70, 140, 140);
    ctx.restore();
  }
}

/* ── Act IV — the scale ───────────────────────────────────────────────── */

/** Growth trajectory: axis, area, line, year ticks, and a travelling head. */
export function paintGrowth(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  p: number,
) {
  const s = GROWTH.series;
  if (s.length < 2) return;

  const padX = Math.min(w * 0.14, 190);
  const padTop = h * 0.3;
  const padBot = h * 0.22;
  const x0 = padX;
  const x1 = w - padX;
  const y0 = h - padBot;
  const y1 = padTop;

  const max = Math.max(...s.map((d) => d.value)) * 1.12 || 1;
  const px = (i: number) => x0 + ((x1 - x0) * i) / (s.length - 1);
  const py = (v: number) => y0 - ((y0 - y1) * v) / max;

  // Held to the back half of the act so it never sits under the figures,
  // and never faded out at the end so the frame stays alive through the
  // hand-off into the next act.
  const grow = easeInOut(range(p, 0.66, 0.96));
  const fade = range(p, 0.6, 0.72);

  ctx.save();
  ctx.globalAlpha = fade;

  // Baseline
  ctx.strokeStyle = `rgba(${GOLD}, 0.28)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y0);
  ctx.stroke();

  // Horizontal guides
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let g = 1; g <= 3; g++) {
    const y = y0 - ((y0 - y1) * g) / 4;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }

  // Sampled curve up to `grow`
  const samples: [number, number][] = [];
  const total = (s.length - 1) * grow;
  for (let i = 0; i <= Math.floor(total); i++) samples.push([px(i), py(s[i].value)]);
  const frac = total - Math.floor(total);
  if (frac > 0 && Math.floor(total) < s.length - 1) {
    const a = s[Math.floor(total)];
    const b = s[Math.floor(total) + 1];
    samples.push([
      px(Math.floor(total) + frac),
      py(a.value + (b.value - a.value) * frac),
    ]);
  }

  if (samples.length > 1) {
    // Area under the curve
    const area = ctx.createLinearGradient(0, y1, 0, y0);
    area.addColorStop(0, `rgba(${CYAN}, 0.3)`);
    area.addColorStop(1, `rgba(${CYAN}, 0)`);
    ctx.fillStyle = area;
    ctx.beginPath();
    ctx.moveTo(samples[0][0], y0);
    samples.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(samples[samples.length - 1][0], y0);
    ctx.closePath();
    ctx.fill();

    // The line itself
    ctx.strokeStyle = `rgba(${CYAN_HI}, 0.95)`;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = `rgba(${CYAN}, 0.9)`;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    samples.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Travelling head
    const head = samples[samples.length - 1];
    const beat = 0.6 + 0.4 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(${GOLD_HI}, 1)`;
    ctx.shadowColor = `rgba(${GOLD}, 1)`;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(head[0], head[1], 4 + beat * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Year ticks and values
  ctx.textAlign = "center";
  s.forEach((d, i) => {
    const reveal = clamp01((total - i + 0.5) * 1.5);
    if (reveal <= 0) return;
    const x = px(i);
    ctx.globalAlpha = fade * reveal;
    ctx.strokeStyle = `rgba(${GOLD}, 0.3)`;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y0 + 8);
    ctx.stroke();
    ctx.fillStyle = `rgba(${GOLD_HI}, 0.75)`;
    ctx.font = "500 12px Inter, system-ui, sans-serif";
    ctx.fillText(String(d.year), x, y0 + 26);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "400 11px Inter, system-ui, sans-serif";
    ctx.fillText(d.value.toFixed(1), x, py(d.value) - 14);
  });

  ctx.restore();
}

/* ── Act V — the pillars ──────────────────────────────────────────────── */

/** Three concentric orbits, one per Vision 2040 axis, each with a live node. */
export function paintPillars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  p: number,
) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const base = Math.min(w, h) * 0.17;
  const fade = range(p, 0.02, 0.18);
  if (fade <= 0) return;

  ctx.save();
  ctx.globalAlpha = fade;

  PILLARS.items.forEach((_, i) => {
    const seq = easeOut(clamp01((range(p, 0.05, 0.7) * 3 - i) * 1.2));
    if (seq <= 0) return;
    const r = base * (1 + i * 0.52) * seq;
    const dir = i % 2 === 0 ? 1 : -1;
    const spin = t * 0.1 * dir + i * 2;

    ctx.strokeStyle = i === 1 ? `rgba(${GOLD}, 0.26)` : `rgba(${CYAN}, 0.22)`;
    ctx.lineWidth = 1;
    ctx.setLineDash(i === 1 ? [] : [2, 7]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Orbiting node
    const nx = cx + Math.cos(spin) * r;
    const ny = cy + Math.sin(spin) * r * 0.82;
    ctx.fillStyle = i === 1 ? `rgba(${GOLD_HI}, 0.95)` : `rgba(${CYAN_HI}, 0.9)`;
    ctx.shadowColor = i === 1 ? `rgba(${GOLD}, 1)` : `rgba(${CYAN}, 1)`;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(nx, ny, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Core
  const beat = 0.72 + 0.28 * Math.sin(t * 1.4);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.72 * beat);
  g.addColorStop(0, `rgba(${GOLD_HI}, 0.4)`);
  g.addColorStop(0.4, `rgba(${GOLD}, 0.12)`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, base * 0.72 * beat, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ── Act VI — the roadmap ─────────────────────────────────────────────── */

/** A horizontal rail with four stations, filling as the act is scrolled. */
export function paintRoadmap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  p: number,
) {
  const n = ROADMAP.phases.length;
  // The rail runs under the phase copy, not through it.
  const y = h * 0.8;
  const x0 = w * 0.12;
  const x1 = w * 0.88;
  const fade = range(p, 0.02, 0.16);
  if (fade <= 0) return;

  const fill = easeInOut(range(p, 0.1, 0.85));

  ctx.save();
  ctx.globalAlpha = fade;

  // Unfilled rail
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();

  // Filled rail
  const xf = x0 + (x1 - x0) * fill;
  const grad = ctx.createLinearGradient(x0, 0, xf, 0);
  grad.addColorStop(0, `rgba(${CYAN}, 0.7)`);
  grad.addColorStop(1, `rgba(${GOLD_HI}, 0.95)`);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2.4;
  ctx.shadowColor = `rgba(${CYAN}, 0.7)`;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(xf, y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Stations
  for (let i = 0; i < n; i++) {
    const sx = x0 + ((x1 - x0) * i) / (n - 1);
    const on = clamp01((xf - sx) / 40 + 0.5);
    const r = 4 + on * 4;
    ctx.fillStyle = on > 0.5 ? `rgba(${GOLD_HI}, ${0.5 + on * 0.5})` : "rgba(255,255,255,0.22)";
    if (on > 0.5) {
      ctx.shadowColor = `rgba(${GOLD}, 0.9)`;
      ctx.shadowBlur = 16 * on;
    }
    ctx.beginPath();
    ctx.arc(sx, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (on > 0.9) {
      const beat = (t * 0.6 + i * 0.4) % 1;
      ctx.strokeStyle = `rgba(${GOLD}, ${0.3 * (1 - beat)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, y, r + beat * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // The travelling aircraft light
  if (fill > 0.02 && fill < 0.995) {
    ctx.fillStyle = `rgba(${CYAN_HI}, 1)`;
    ctx.shadowColor = `rgba(${CYAN}, 1)`;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(xf, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

/* ── Act VII — the close ──────────────────────────────────────────────── */

/** A radial burst of route lines settling into a steady constellation. */
export function paintClose(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  p: number,
  quality: QualityTier,
) {
  const cx = w * 0.5;
  const cy = h * 0.56;
  const fade = range(p, 0.02, 0.25);
  if (fade <= 0) return;
  const spread = easeOut(range(p, 0.05, 0.75));
  const rays = quality === "low" ? 26 : quality === "medium" ? 44 : 68;
  const maxR = Math.hypot(w, h) * 0.62;

  ctx.save();
  ctx.globalAlpha = fade;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + t * 0.015;
    const len = maxR * spread * (0.45 + 0.55 * ((i * 37) % 11) / 11);
    const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.7);
    g.addColorStop(0, `rgba(${GOLD_HI}, 0.3)`);
    g.addColorStop(0.35, `rgba(${CYAN}, 0.16)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.7);
    ctx.stroke();
  }

  const beat = 0.75 + 0.25 * Math.sin(t * 1.1);
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150 * beat * spread);
  core.addColorStop(0, `rgba(${GOLD_HI}, 0.2)`);
  core.addColorStop(0.35, `rgba(${GOLD}, 0.07)`);
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, 150 * beat * spread, 0, Math.PI * 2);
  ctx.fill();

  // A soft pocket of shade across the middle so the sign-off stays legible
  // against the burst. Without it the rays read straight through the type.
  const pocket = ctx.createRadialGradient(
    w * 0.5, h * 0.5, 0,
    w * 0.5, h * 0.5, Math.min(w, h) * 0.62,
  );
  pocket.addColorStop(0, "rgba(4, 7, 15, 0.72)");
  pocket.addColorStop(0.55, "rgba(4, 7, 15, 0.4)");
  pocket.addColorStop(1, "rgba(4, 7, 15, 0)");
  ctx.fillStyle = pocket;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
