"use client";

import { useEffect, useState, useCallback } from "react";

interface Task {
  id: string;
  title: string;
  status: string;
  importance: string;
  dueDateTime?: { dateTime: string };
  createdDateTime: string;
}

function formatDue(dateStr?: string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Due today";
  if (date.toDateString() === tomorrow.toDateString()) return "Due tomorrow";
  if (date < today) return "Overdue";
  return `Due ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

function Skeleton() {
  return (
    <div className="animate-pulse px-4 py-3 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TasksList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [listId, setListId] = useState<string | null>(null);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/outlook/tasks");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setTasks(data.tasks ?? []);
      setListId(data.listId);
    } catch {
      setError("Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function completeTask(taskId: string) {
    if (!listId) return;
    setCompleting((prev) => new Set(prev).add(taskId));
    try {
      await fetch("/api/outlook/tasks/complete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, taskId }),
      });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } finally {
      setCompleting((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Tasks</h2>
            {!loading && tasks.length > 0 && (
              <p className="text-xs text-gray-400">{tasks.length} pending</p>
            )}
          </div>
        </div>
        <button
          onClick={fetchTasks}
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
      ) : tasks.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-xs text-gray-400">All tasks completed!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {tasks.map((task) => {
            const dueLabel = formatDue(task.dueDateTime?.dateTime);
            const isOverdue = dueLabel === "Overdue";
            const isDueToday = dueLabel === "Due today";
            const isCompleting = completing.has(task.id);

            return (
              <div key={task.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                <button
                  onClick={() => completeTask(task.id)}
                  disabled={isCompleting}
                  className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    isCompleting
                      ? "border-emerald-400 bg-emerald-400"
                      : "border-gray-300 hover:border-emerald-400"
                  }`}
                >
                  {isCompleting && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${isCompleting ? "line-through text-gray-400" : "text-gray-800"}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {dueLabel && (
                      <span className={`text-xs font-medium ${
                        isOverdue ? "text-red-500" : isDueToday ? "text-amber-500" : "text-gray-400"
                      }`}>
                        {dueLabel}
                      </span>
                    )}
                    {task.importance === "high" && (
                      <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-medium">High</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
