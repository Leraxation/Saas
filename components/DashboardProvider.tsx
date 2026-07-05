"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface Email {
  id: string;
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: { displayName: string };
  isAllDay: boolean;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  importance: string;
  dueDateTime?: { dateTime: string };
  createdDateTime: string;
}

interface DashboardData {
  emails: Email[];
  events: CalendarEvent[];
  tasks: Task[];
  listId: string | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  readOnly: boolean;
  refresh: () => void;
  completeTask: (taskId: string) => Promise<void>;
  markEmailRead: (emailId: string) => Promise<void>;
}

const Ctx = createContext<DashboardData | null>(null);

export function useDashboard(): DashboardData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider");
  return ctx;
}

const REFRESH_INTERVAL_MS = 60_000;

export function DashboardProvider({
  readOnly,
  children,
}: {
  readOnly: boolean;
  children: React.ReactNode;
}) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [listId, setListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      const [emailsRes, calendarRes, tasksRes] = await Promise.all([
        fetch("/api/outlook/emails"),
        fetch("/api/outlook/calendar"),
        fetch("/api/outlook/tasks"),
      ]);
      if (!emailsRes.ok || !calendarRes.ok || !tasksRes.ok) {
        throw new Error("One or more requests failed");
      }
      const [emailsData, calendarData, tasksData] = await Promise.all([
        emailsRes.json(),
        calendarRes.json(),
        tasksRes.json(),
      ]);
      setEmails(emailsData.value ?? []);
      setEvents(calendarData.value ?? []);
      setTasks(tasksData.tasks ?? []);
      setListId(tasksData.listId ?? null);
      setLastUpdated(new Date());
    } catch {
      setError("Could not load Outlook data. Retrying in a minute.");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const completeTask = useCallback(
    async (taskId: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (readOnly || !listId) return;
      await fetch("/api/outlook/tasks/complete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, taskId }),
      });
    },
    [readOnly, listId]
  );

  const markEmailRead = useCallback(
    async (emailId: string) => {
      setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, isRead: true } : e)));
      if (readOnly) return;
      await fetch("/api/outlook/emails/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: emailId }),
      });
    },
    [readOnly]
  );

  return (
    <Ctx.Provider
      value={{
        emails,
        events,
        tasks,
        listId,
        loading,
        error,
        lastUpdated,
        readOnly,
        refresh,
        completeTask,
        markEmailRead,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
