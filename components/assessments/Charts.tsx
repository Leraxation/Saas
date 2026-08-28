/** Presentational chart primitives for the assessment reports — plain SVG, no chart library. */

export interface RadarSeries {
  label: string;
  color: string;
  /** One value per axis, 0-100. null leaves the axis un-plotted for that series. */
  values: (number | null)[];
  /** Dashed outline — used for the norm reference so it reads as a benchmark, not a result. */
  dashed?: boolean;
  fill?: boolean;
}

/** Greedy wrap so long competency names stay inside the chart's margin. */
function wrapLabel(label: string, maxChars = 15): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of label.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function RadarChart({
  axes,
  series,
  size = 380,
}: {
  axes: string[];
  series: RadarSeries[];
  size?: number;
}) {
  // Wider than tall: the axis labels sit outside the plot and need horizontal room,
  // so the viewBox is padded rather than the plot being shrunk to fit a square.
  const width = size * 1.37;
  const height = size * 1.16;
  const cx = width / 2;
  const cy = height / 2;
  const radius = size * 0.374;
  const n = axes.length;

  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
  };

  const rings = [25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Competency profile radar chart">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => point(i, ring).join(",")).join(" ")}
          fill={ring === 100 ? "#f8fafc" : "none"}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth={1} />;
      })}

      {series.map((s) => {
        const plotted = s.values.map((v, i) => (v === null ? null : point(i, v)));
        if (plotted.some((p) => p === null)) return null;
        const points = (plotted as (readonly [number, number])[]).map((p) => p.join(",")).join(" ");
        return (
          <g key={s.label}>
            <polygon
              points={points}
              fill={s.fill === false ? "none" : s.color}
              fillOpacity={s.fill === false ? 0 : 0.14}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "5 4" : undefined}
              strokeLinejoin="round"
            />
            {!s.dashed &&
              (plotted as (readonly [number, number])[]).map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={s.color} />
              ))}
          </g>
        );
      })}

      {axes.map((label, i) => {
        const [x, y] = point(i, 118);
        const anchor = Math.abs(x - cx) < 4 ? "middle" : x > cx ? "start" : "end";
        const lines = wrapLabel(label);
        return (
          <text key={label} x={x} y={y} textAnchor={anchor} className="fill-slate-500" fontSize={11} fontWeight={500}>
            {lines.map((line, li) => (
              <tspan key={li} x={x} dy={li === 0 ? (lines.length > 1 ? -5 : 0) : 12}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

export function RadarLegend({ series }: { series: RadarSeries[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
      {series.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5">
          <span
            className="w-4 h-0 border-t-2 rounded"
            style={{ borderColor: s.color, borderStyle: s.dashed ? "dashed" : "solid" }}
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/** Horizontal 0-100 bar with a norm marker — the standard benchmarking row. */
export function ScoreBar({
  value,
  norm,
  color = "#4f46e5",
  height = 8,
}: {
  value: number | null;
  norm?: number | null;
  color?: string;
  height?: number;
}) {
  return (
    <div className="relative w-full rounded-full bg-slate-100" style={{ height }}>
      {value !== null && (
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
        />
      )}
      {typeof norm === "number" && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 bg-slate-500"
          style={{ left: `${Math.max(0, Math.min(100, norm))}%` }}
          title={`Norm ${norm.toFixed(0)}`}
        />
      )}
    </div>
  );
}

/** Bipolar trait strip on the 1-10 sten scale. */
export function TraitStrip({ sten, color = "#6366f1" }: { sten: number; color?: string }) {
  return (
    <div className="flex gap-[3px]" role="img" aria-label={`Sten score ${sten} of 10`}>
      {Array.from({ length: 10 }, (_, i) => {
        const active = i + 1 === sten;
        const nearby = Math.abs(i + 1 - sten) === 1;
        return (
          <span
            key={i}
            className="h-5 flex-1 rounded-sm"
            style={{
              background: active ? color : nearby ? `${color}44` : "#f1f5f9",
            }}
          />
        );
      })}
    </div>
  );
}

const HEAT_STOPS: [number, string][] = [
  [0, "#fecaca"],
  [45, "#fed7aa"],
  [58, "#fde68a"],
  [70, "#bbf7d0"],
  [82, "#86efac"],
];

export function heatColor(score: number | null): string {
  if (score === null) return "#f1f5f9";
  let color = HEAT_STOPS[0][1];
  for (const [threshold, stop] of HEAT_STOPS) {
    if (score >= threshold) color = stop;
  }
  return color;
}

export function Donut({
  value,
  label,
  sublabel,
  color = "#4f46e5",
  size = 132,
}: {
  value: number;
  label: string;
  sublabel?: string;
  color?: string;
  size?: number;
}) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-slate-900 leading-none">{label}</span>
        {sublabel && <span className="text-[11px] text-slate-500 mt-1">{sublabel}</span>}
      </div>
    </div>
  );
}
