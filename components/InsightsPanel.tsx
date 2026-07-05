"use client";

import { useMemo } from "react";
import { useDashboard } from "@/components/DashboardProvider";
import { rankEmails, findConflicts, noiseSummary, findFocusWindows } from "@/lib/insights";

function formatTime(dateTime: string): string {
  return new Date(dateTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function InsightsPanel() {
  const { emails, events, loading } = useDashboard();

  const priorities = useMemo(() => rankEmails(emails), [emails]);
  const conflicts = useMemo(() => findConflicts(events), [events]);
  const noise = useMemo(() => noiseSummary(emails), [emails]);
  const focusWindows = useMemo(() => findFocusWindows(events), [events]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    );
  }

  const nothingToShow = priorities.length === 0 && conflicts.length === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0013 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Smart Insights</h2>
      </div>

      <div className="divide-y divide-gray-50">
        {conflicts.length > 0 && (
          <div className="px-4 py-3">
            {conflicts.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">Meeting conflict</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    &ldquo;{c.a.subject}&rdquo; overlaps &ldquo;{c.b.subject}&rdquo; at {formatTime(c.b.start.dateTime)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {priorities.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Needs your attention
            </p>
            <div className="space-y-2.5">
              {priorities.map(({ email, reasons }) => (
                <div key={email.id} className="min-w-0">
                  <p className="text-sm text-gray-800 leading-snug truncate">
                    {email.subject || "(no subject)"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400">
                      {email.from?.emailAddress?.name ?? email.from?.emailAddress?.address}
                    </span>
                    {reasons.slice(0, 2).map((r) => (
                      <span key={r} className="text-[10.5px] font-medium bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {nothingToShow && (
          <p className="px-4 py-5 text-center text-xs text-gray-400">
            Nothing urgent — no conflicts and no high-priority unread emails. 👌
          </p>
        )}

        {focusWindows.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Focus time today
            </p>
            <div className="space-y-1.5">
              {focusWindows.map((w, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <svg className={`w-3.5 h-3.5 flex-shrink-0 ${i === 0 ? "text-emerald-500" : "text-gray-300"}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-700">
                    {formatTime(w.start.toISOString())} – {formatTime(w.end.toISOString())}
                    <span className="text-xs text-gray-400 ml-2">
                      {w.minutes >= 60
                        ? `${Math.floor(w.minutes / 60)}h${w.minutes % 60 ? ` ${w.minutes % 60}m` : ""} free`
                        : `${w.minutes}m free`}
                      {i === 0 && " · best for deep work"}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {noise.total > 0 && noise.automated > 0 && (
          <p className="px-4 py-2.5 text-xs text-gray-400">
            {noise.automated} of {noise.total} inbox emails are automated notifications.
          </p>
        )}
      </div>
    </div>
  );
}
