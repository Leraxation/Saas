"use client";

import { useDashboard, type CalendarEvent } from "@/components/DashboardProvider";

function formatTime(dateTime: string): string {
  return new Date(dateTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDay(dateTime: string): string {
  const date = new Date(dateTime);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function groupByDay(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime()
  );
  return sorted.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const day = formatDay(event.start.dateTime);
    (acc[day] ??= []).push(event);
    return acc;
  }, {});
}

function eventStatus(event: CalendarEvent): "now" | "soon" | null {
  const now = Date.now();
  const start = new Date(event.start.dateTime).getTime();
  const end = new Date(event.end.dateTime).getTime();
  if (start <= now && end > now) return "now";
  if (start > now && start - now < 60 * 60 * 1000) return "soon";
  return null;
}

const DOT_COLORS = ["bg-indigo-500", "bg-purple-500", "bg-blue-500", "bg-teal-500", "bg-pink-500"];

function Skeleton() {
  return (
    <div className="animate-pulse px-4 py-3 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-200 mt-2 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CalendarWidget() {
  const { events, loading, error, refresh } = useDashboard();
  const grouped = groupByDay(events);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-900">Calendar</h2>
        </div>
        <button
          onClick={refresh}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <p className="px-4 py-6 text-center text-xs text-red-400">{error}</p>
      ) : events.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-gray-400">No events in the next 7 days.</p>
      ) : (
        <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {Object.entries(grouped).map(([day, dayEvents], gi) => (
            <div key={day} className="px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{day}</p>
              <div className="space-y-2">
                {dayEvents.map((event, ei) => {
                  const color = DOT_COLORS[(gi + ei) % DOT_COLORS.length];
                  const status = eventStatus(event);
                  return (
                    <div key={event.id} className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${color} mt-1.5 flex-shrink-0 ${status === "now" ? "animate-pulse" : ""}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 leading-snug truncate">
                            {event.subject}
                          </p>
                          {status === "now" && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide bg-red-50 text-red-500 px-1.5 py-0.5 rounded flex-shrink-0">
                              Now
                            </span>
                          )}
                          {status === "soon" && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded flex-shrink-0">
                              Soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {event.isAllDay
                            ? "All day"
                            : `${formatTime(event.start.dateTime)} – ${formatTime(event.end.dateTime)}`}
                          {event.location?.displayName ? ` · ${event.location.displayName}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
