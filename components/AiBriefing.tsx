"use client";

import { useState } from "react";

// Minimal markdown rendering for the briefing: **bold** and bullet lines.
function renderLine(line: string, key: number) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );

  const trimmed = line.trim();
  if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
    return (
      <li key={key} className="ml-4 list-disc text-sm text-gray-700 leading-relaxed">
        {line.trim().slice(2).split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
          ) : (
            part
          )
        )}
      </li>
    );
  }
  if (!trimmed) return null;
  return (
    <p key={key} className="text-sm text-gray-700 leading-relaxed">{parts}</p>
  );
}

export function AiBriefing({ enabled }: { enabled: boolean }) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/brief", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate briefing");
      setBriefing(data.briefing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">AI Daily Briefing</h2>
            <p className="text-xs text-gray-500 truncate">
              {enabled
                ? "Claude reads your inbox, calendar, and tasks — and tells you what matters."
                : "Add an ANTHROPIC_API_KEY environment variable to enable AI briefings."}
            </p>
          </div>
        </div>

        {enabled && (
          <button
            onClick={generate}
            disabled={loading}
            className="flex-shrink-0 flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Thinking…
              </>
            ) : briefing ? (
              "Regenerate"
            ) : (
              "Generate briefing"
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="px-5 pb-4">
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        </div>
      )}

      {briefing && (
        <div className="px-5 pb-5">
          <div className="bg-white/70 border border-indigo-100 rounded-lg p-4 space-y-2">
            {briefing.split("\n").map((line, i) => renderLine(line, i))}
          </div>
        </div>
      )}
    </div>
  );
}
