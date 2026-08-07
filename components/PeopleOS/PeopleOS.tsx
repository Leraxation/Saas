"use client";

import { useState } from "react";
import Link from "next/link";
import { ConstellationMap } from "@/components/PeopleOS/ConstellationMap";
import { DepartmentPanel } from "@/components/PeopleOS/DepartmentPanel";
import { CENTER, getDepartment } from "@/lib/departments";

export default function PeopleOS({ aiEnabled }: { aiEnabled: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? getDepartment(selectedId) ?? null : null;

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Back to dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <p className="text-white font-semibold text-sm leading-none">{CENTER.name}</p>
              <p className="text-slate-500 text-xs mt-1">{CENTER.subtitle} · click a node to open its agent</p>
            </div>
          </div>
          {!aiEnabled && (
            <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
              Agents asleep — set ANTHROPIC_API_KEY
            </span>
          )}
        </header>

        <div className="flex-1 flex items-center justify-center p-4 min-h-0">
          <ConstellationMap selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>

      {selected && (
        <div className="w-full max-w-sm flex-shrink-0">
          <DepartmentPanel department={selected} enabled={aiEnabled} onClose={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  );
}
