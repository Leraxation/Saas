"use client";

import { useRef, useState } from "react";
import { Card } from "./ui";
import type { CoachingNote } from "@/lib/assessments/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function CoachPanel({
  assessmentId,
  prompts,
  aiEnabled,
  initialNotes,
}: {
  assessmentId: string;
  prompts: string[];
  aiEnabled: boolean;
  initialNotes: CoachingNote[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [audience, setAudience] = useState<"leader" | "coach">("leader");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState<CoachingNote[]>(initialNotes);
  const [noteAuthor, setNoteAuthor] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only the last few turns are sent — the report itself is the context that matters.
        body: JSON.stringify({ messages: next.slice(-12), audience }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "The coach could not respond.");
      setMessages([...next, { role: "assistant", content: body.reply }]);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The coach could not respond.");
      setMessages(next);
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    if (!noteAuthor.trim() || !noteBody.trim() || savingNote) return;
    setSavingNote(true);
    setNoteError(null);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: noteAuthor.trim(), body: noteBody.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save the note.");
      setNotes(body.notes as CoachingNote[]);
      setNoteBody("");
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : "Could not save the note.");
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card
        title="Coaching conversation"
        subtitle={
          aiEnabled
            ? "Works only from this report's evidence — it will say when something is not in the data."
            : "Add ANTHROPIC_API_KEY to enable the coaching agent."
        }
        action={
          aiEnabled ? (
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs">
              {(["leader", "coach"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAudience(a)}
                  className={`px-2.5 py-1 rounded-md font-medium capitalize ${
                    audience === a ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {a === "leader" ? "With the leader" : "With the coach"}
                </button>
              ))}
            </div>
          ) : null
        }
      >
        {!aiEnabled ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              These prompts are generated from the report and can be used in a session without the AI coach:
            </p>
            <ul className="space-y-2">
              {prompts.map((p) => (
                <li key={p} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-sm text-slate-700">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Suggested openers</p>
                  {prompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => send(p)}
                      className="block w-full text-left rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white ml-8"
                      : "bg-slate-50 border border-slate-100 text-slate-800 mr-8"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {busy && <p className="text-xs text-slate-400">Thinking…</p>}
              <div ref={endRef} />
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the results…"
                maxLength={3000}
                className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </>
        )}
      </Card>

      <Card title="Coaching log" subtitle="Session notes kept against this assessment.">
        <div className="space-y-2">
          <input
            value={noteAuthor}
            onChange={(e) => setNoteAuthor(e.target.value)}
            placeholder="Coach name"
            maxLength={80}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="What was agreed in this session?"
            rows={3}
            maxLength={800}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{noteBody.length}/800</span>
            <button
              type="button"
              onClick={saveNote}
              disabled={savingNote || !noteAuthor.trim() || !noteBody.trim()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {savingNote ? "Saving…" : "Add note"}
            </button>
          </div>
          {noteError && <p className="text-sm text-red-600">{noteError}</p>}
        </div>

        <div className="mt-5 space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {notes.length === 0 ? (
            <p className="text-sm text-slate-400">No notes logged yet.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{note.author}</span>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap">{note.body}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
