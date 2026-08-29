"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface CognitiveItemView {
  id: string;
  domain: string;
  stem: string;
  context?: string;
  options: { id: string; text: string }[];
}

function formatClock(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Timed reasoning battery. One item at a time, no going back — a submitted
 * answer is final, which is what makes the timing measure meaningful.
 */
export function CognitiveRunner({
  items,
  timeLimitSeconds,
  onSubmit,
  busy = false,
  error,
}: {
  items: CognitiveItemView[];
  timeLimitSeconds: number;
  onSubmit: (responses: Record<string, string>, durationSeconds: number) => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [choice, setChoice] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(timeLimitSeconds);
  const startRef = useRef<number>(0);
  const submittedRef = useRef(false);

  const finish = useCallback(
    (finalResponses: Record<string, string>) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      const elapsed = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
      onSubmit(finalResponses, elapsed);
    },
    [onSubmit]
  );

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const left = timeLimitSeconds - elapsed;
      setRemaining(left);
      // Time-out submits whatever has been answered: unanswered items score as incorrect.
      if (left <= 0) {
        clearInterval(id);
        finish(responses);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [started, timeLimitSeconds, responses, finish]);

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-8">
        <h2 className="text-lg font-semibold text-slate-900">Before you start</h2>
        <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
          <li>• {items.length} items, {Math.round(timeLimitSeconds / 60)} minutes. The timer starts when you begin and does not pause.</li>
          <li>• One item at a time. Once you move on you cannot go back.</li>
          <li>• Unanswered items count as incorrect, so answer even when unsure.</li>
          <li>• Work somewhere quiet — accuracy and pace are both recorded.</li>
        </ul>
        <button
          type="button"
          onClick={() => {
            startRef.current = Date.now();
            setStarted(true);
          }}
          className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Start the battery
        </button>
      </div>
    );
  }

  const item = items[index];
  const last = index === items.length - 1;
  const low = remaining <= 60;

  function advance() {
    if (!choice) return;
    const updated = { ...responses, [item.id]: choice };
    setResponses(updated);
    setChoice(null);
    if (last) {
      finish(updated);
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-slate-500">
          Item {index + 1} of {items.length}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
            low ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"
          }`}
          role="timer"
          aria-live="off"
        >
          {formatClock(remaining)}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-6">
        <div
          className="h-full bg-indigo-600 rounded-full transition-[width] duration-300"
          style={{ width: `${(index / items.length) * 100}%` }}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {item.context && (
          <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-4 leading-relaxed">
            {item.context}
          </p>
        )}
        <h2 className="text-base font-semibold text-slate-900 mt-4">{item.stem}</h2>

        <div className="mt-4 space-y-2">
          {item.options.map((option) => {
            const selected = choice === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setChoice(option.id)}
                aria-pressed={selected}
                className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                  selected
                    ? "border-indigo-600 bg-indigo-50 text-slate-900"
                    : "border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50"
                }`}
              >
                <span className="font-semibold text-slate-400 mr-2 uppercase">{option.id}</span>
                {option.text}
              </button>
            );
          })}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={advance}
            disabled={!choice || busy}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {busy ? "Scoring…" : last ? "Finish battery" : "Next item"}
          </button>
        </div>
      </div>
    </div>
  );
}
