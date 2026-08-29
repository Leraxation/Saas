"use client";

import { useMemo, useState } from "react";

export interface LikertSection {
  id: string;
  title: string;
  description: string;
  items: { id: string; text: string }[];
}

/**
 * Section-by-section Likert runner, shared by the self-assessment modules and the
 * 360 rater form so both produce identically-keyed responses.
 */
export function LikertRunner({
  sections,
  labels,
  onSubmit,
  submitLabel = "Submit",
  intro,
  extra,
  busy = false,
  error,
}: {
  sections: LikertSection[];
  labels: string[];
  onSubmit: (responses: Record<string, number>) => void;
  submitLabel?: string;
  intro?: React.ReactNode;
  /** Rendered on the final section — used by the 360 form for its comment boxes. */
  extra?: React.ReactNode;
  busy?: boolean;
  error?: string | null;
}) {
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [showMissing, setShowMissing] = useState(false);

  const total = useMemo(() => sections.reduce((a, s) => a + s.items.length, 0), [sections]);
  const answered = Object.keys(responses).length;
  const section = sections[index];
  const last = index === sections.length - 1;
  const sectionComplete = section.items.every((item) => responses[item.id] !== undefined);

  function choose(itemId: string, value: number) {
    setResponses((prev) => ({ ...prev, [itemId]: value }));
  }

  function next() {
    if (!sectionComplete) {
      setShowMissing(true);
      return;
    }
    setShowMissing(false);
    if (last) {
      onSubmit(responses);
    } else {
      setIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {intro && index === 0 && <div className="mb-6">{intro}</div>}

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>
            {sections.length > 1 ? `Section ${index + 1} of ${sections.length}` : "Progress"}
          </span>
          <span>
            {answered} of {total} answered
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-[width] duration-300"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
        <p className="text-sm text-slate-500 mt-1">{section.description}</p>

        <div className="mt-6 space-y-5">
          {section.items.map((item) => {
            const missing = showMissing && responses[item.id] === undefined;
            return (
              <fieldset
                key={item.id}
                className={`rounded-lg border p-4 ${missing ? "border-amber-300 bg-amber-50" : "border-slate-100"}`}
              >
                <legend className="sr-only">{item.text}</legend>
                <p className="text-sm text-slate-800">{item.text}</p>
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                  {labels.map((label, i) => {
                    const value = i + 1;
                    const selected = responses[item.id] === value;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => choose(item.id, value)}
                        aria-pressed={selected}
                        className={`rounded-md border px-1 py-2 text-[11px] leading-tight font-medium transition-colors ${
                          selected
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        {last && extra && <div className="mt-6">{extra}</div>}

        {showMissing && !sectionComplete && (
          <p className="mt-4 text-sm text-amber-700">Answer every item in this section to continue.</p>
        )}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setShowMissing(false);
              setIndex((i) => Math.max(0, i - 1));
            }}
            disabled={index === 0 || busy}
            className="text-sm text-slate-500 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-500"
          >
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : last ? submitLabel : "Next section"}
          </button>
        </div>
      </div>
    </div>
  );
}
