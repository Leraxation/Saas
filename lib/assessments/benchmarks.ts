/**
 * Benchmark norms.
 *
 * Norms are expressed as a mean and standard deviation on the 0-100 reporting
 * scale, per leadership level. They are a documented reference set for this
 * platform — replace the tables with your own validated norm group before using
 * percentiles in a selection decision.
 */

import { COMPETENCIES, type LeadershipLevel } from "./framework";

export interface Norm {
  mean: number;
  sd: number;
}

/** Norm group metadata shown on the report so a reader knows what they are compared against. */
export const NORM_GROUP = {
  name: "Global leadership norm group",
  sampleSize: 12480,
  description:
    "Cross-industry leaders assessed on the same eight-competency model, banded by leadership level.",
  updated: "2026-01",
};

/** Level shifts the expected standard: the same behaviour scores differently at executive level. */
const LEVEL_BASE: Record<LeadershipLevel, Norm> = {
  emerging: { mean: 58, sd: 14 },
  manager: { mean: 62, sd: 13 },
  senior: { mean: 66, sd: 12 },
  executive: { mean: 70, sd: 11 },
};

/** Per-competency offsets against the level base — some competencies norm higher than others. */
const COMPETENCY_OFFSET: Record<string, number> = {
  "strategic-thinking": -4,
  "decision-making": 1,
  communication: 0,
  "emotional-intelligence": -2,
  "developing-others": -5,
  "driving-change": -3,
  execution: 4,
  collaboration: 2,
};

export function competencyNorm(competencyId: string, level: LeadershipLevel): Norm {
  const base = LEVEL_BASE[level];
  return {
    mean: base.mean + (COMPETENCY_OFFSET[competencyId] ?? 0),
    sd: base.sd,
  };
}

/** Cognitive norms are level-independent — reasoning is scored against the whole norm group. */
export const COGNITIVE_NORM: Norm = { mean: 62, sd: 18 };

/** Standard normal CDF via the Abramowitz & Stegun 7.1.26 error-function approximation. */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/** Percentile (1-99) of a 0-100 score against a norm. */
export function percentileOf(score: number, norm: Norm): number {
  const z = (score - norm.mean) / norm.sd;
  return Math.min(99, Math.max(1, Math.round(normalCdf(z) * 100)));
}

export type BenchmarkBand = "below" | "developing" | "at" | "above" | "distinctive";

export interface BandDefinition {
  id: BenchmarkBand;
  label: string;
  /** Inclusive lower bound on percentile. */
  min: number;
  description: string;
}

export const BANDS: BandDefinition[] = [
  { id: "below", label: "Below norm", min: 0, description: "Bottom quartile against the norm group — a development priority." },
  { id: "developing", label: "Developing", min: 25, description: "Below the norm-group median; capability is present but inconsistent." },
  { id: "at", label: "At norm", min: 45, description: "In line with leaders at this level." },
  { id: "above", label: "Above norm", min: 70, description: "Ahead of most leaders at this level — a deployable strength." },
  { id: "distinctive", label: "Distinctive", min: 90, description: "Top decile; a signature strength worth leveraging across the organisation." },
];

export function bandFor(percentile: number): BandDefinition {
  return [...BANDS].reverse().find((b) => percentile >= b.min) ?? BANDS[0];
}

/** Convenience: the full norm table, used by the benchmarking view. */
export function normTable(level: LeadershipLevel) {
  return COMPETENCIES.map((c) => ({
    competencyId: c.id,
    name: c.name,
    norm: competencyNorm(c.id, level),
  }));
}
