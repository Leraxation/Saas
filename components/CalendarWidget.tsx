"use client";

import { useEffect, useState, useCallback } from "react";

interface CalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  organizer?: { emailAddress: { name: string } };
  isAllDay: boolean;
}

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
  return events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const day = formatDay(event.start.dateTime);
    if (!acc[day]) acc[day] = [];
    acc[day].push(event);
    return acc;
  }, {});
}

const dotColors = [
  "bg-indigo-500", "bg-purple-500", "bg-blue-500", "bg-teal-500", "bg-pink-500",
];

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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/outlook/calendar");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEvents(data.value ?? []);
    } catch {
      setError("Could not load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const grouped = groupByDay(events);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-900">Calendar</h2>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
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
        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {Object.entries(grouped).map(([day, dayEvents], gi) => (
            <div key={day} className="px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{day}</p>
              <div className="space-y-2">
                {dayEvents.map((event, ei) => {
                  const color = dotColors[(gi + ei) % dotColors.length];
                  return (
                    <div key={event.id} className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${color} mt-1.5 flex-shrink-0`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 leading-snug truncate">
                          {event.subject}
                        </p>
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
