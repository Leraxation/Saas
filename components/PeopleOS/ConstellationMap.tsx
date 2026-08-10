"use client";

import { useMemo, type CSSProperties } from "react";
import { CENTER, DEPARTMENTS, type Department } from "@/lib/departments";

const SIZE = 900;
const CX = SIZE / 2;
const CY = SIZE / 2;
const DEPT_RADIUS = 260;
const LEAF_RADIUS_MIN = 60;
const LEAF_RADIUS_MAX = 150;
const LEAF_SPREAD_DEG = 34;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  // Fixed precision keeps server- and client-rendered markup byte-identical
  // (raw floats can print an extra digit depending on the JS engine, which trips hydration).
  return {
    x: Math.round((cx + r * Math.cos(rad)) * 1000) / 1000,
    y: Math.round((cy + r * Math.sin(rad)) * 1000) / 1000,
  };
}

interface Leaf {
  x: number;
  y: number;
  label: string;
}

function leavesFor(dept: Department, deptX: number, deptY: number): Leaf[] {
  const n = dept.responsibilities.length;
  return dept.responsibilities.map((label, i) => {
    const spread = n === 1 ? 0 : LEAF_SPREAD_DEG * (i / (n - 1) - 0.5) * 2;
    const angle = dept.angle + spread;
    const r = LEAF_RADIUS_MIN + ((i * 37) % (LEAF_RADIUS_MAX - LEAF_RADIUS_MIN));
    const p = polar(CX, CY, DEPT_RADIUS + r, angle);
    return { x: p.x, y: p.y, label };
  });
}

export function ConstellationMap({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const nodes = useMemo(
    () =>
      DEPARTMENTS.map((dept) => {
        const pos = polar(CX, CY, DEPT_RADIUS, dept.angle);
        const leaves = leavesFor(dept, pos.x, pos.y);
        return { dept, pos, leaves };
      }),
    []
  );

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full h-full max-h-[80vh]"
      role="img"
      aria-label="People Department constellation map"
    >
      <defs>
        <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* background starfield */}
      {Array.from({ length: 60 }).map((_, i) => {
        const x = (i * 137) % SIZE;
        const y = (i * 331) % SIZE;
        const r = 0.6 + ((i * 53) % 10) / 10;
        const duration = 2.4 + ((i * 29) % 30) / 10;
        const delay = -((i * 17) % 40) / 10;
        const max = 0.15 + ((i * 41) % 40) / 100;
        return (
          <circle
            key={`bg-${i}`}
            cx={x}
            cy={y}
            r={r}
            fill="#ffffff"
            className="animate-twinkle"
            style={
              {
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                "--twinkle-min": 0.08,
                "--twinkle-max": max,
              } as CSSProperties
            }
          />
        );
      })}

      {/* center glow */}
      <circle cx={CX} cy={CY} r={110} fill="url(#core-glow)" className="animate-core-breathe" />

      {nodes.map(({ dept, pos, leaves }) => {
        const isSelected = selectedId === dept.id;
        const dim = selectedId !== null && !isSelected;
        return (
          <g key={dept.id} opacity={dim ? 0.35 : 1} className="transition-opacity duration-300">
            {/* spine: center -> department */}
            <line
              x1={CX}
              y1={CY}
              x2={pos.x}
              y2={pos.y}
              stroke={dept.accent}
              strokeWidth={isSelected ? 1.5 : 1}
              opacity={isSelected ? 0.9 : 0.35}
            />
            {/* branches: department -> responsibilities */}
            {leaves.map((leaf, i) => (
              <line
                key={i}
                x1={pos.x}
                y1={pos.y}
                x2={leaf.x}
                y2={leaf.y}
                stroke={dept.accent}
                strokeWidth={0.75}
                opacity={isSelected ? 0.6 : 0.22}
              />
            ))}
            {leaves.map((leaf, i) => (
              <g key={`leaf-${i}`}>
                <circle cx={leaf.x} cy={leaf.y} r={2.5} fill={dept.accent} opacity={isSelected ? 1 : 0.55} />
                {isSelected && (
                  <text
                    x={leaf.x}
                    y={leaf.y}
                    dy={leaf.y > CY ? 14 : -8}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#e2e8f0"
                    className="pointer-events-none select-none"
                  >
                    {leaf.label}
                  </text>
                )}
              </g>
            ))}

            {/* department node */}
            <g
              onClick={() => onSelect(dept.id)}
              className="cursor-pointer outline-none [&:focus]:outline-none"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(dept.id)}
              aria-label={`Open ${dept.name} agent`}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isSelected ? 15 : 11}
                fill={dept.accent}
                opacity={0.25}
                className={`transition-all duration-300 ${!isSelected ? "animate-node-breathe" : ""}`}
                style={
                  !isSelected
                    ? ({
                        animationDelay: `${-(dept.angle / 45)}s`,
                        "--breathe-r-min": "10px",
                        "--breathe-r-max": "14px",
                      } as CSSProperties)
                    : undefined
                }
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isSelected ? 8 : 6}
                fill={dept.accent}
                stroke="#0f172a"
                strokeWidth={1.5}
                className="transition-all duration-300"
              />
              <text
                x={pos.x}
                y={pos.y}
                dy={pos.y > CY ? 26 : -18}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill="#f8fafc"
                className="pointer-events-none select-none"
              >
                {dept.name}
              </text>
              <text
                x={pos.x}
                y={pos.y}
                dy={pos.y > CY ? 41 : -4}
                textAnchor="middle"
                fontSize={10}
                fill="#94a3b8"
                className="pointer-events-none select-none"
              >
                {dept.owner === "Vacant" ? "Vacant" : dept.owner}
              </text>
            </g>
          </g>
        );
      })}

      {/* center node */}
      <g>
        <circle cx={CX} cy={CY} r={26} fill="#1e1b4b" stroke="#a5b4fc" strokeWidth={1.5} />
        <circle cx={CX} cy={CY} r={4} fill="#e0e7ff" className="animate-pulse" />
        <text x={CX} y={CY - 38} textAnchor="middle" fontSize={16} fontWeight={700} fill="#f8fafc">
          {CENTER.name}
        </text>
        <text x={CX} y={CY - 22} textAnchor="middle" fontSize={11} fill="#94a3b8">
          {CENTER.subtitle}
        </text>
      </g>
    </svg>
  );
}
