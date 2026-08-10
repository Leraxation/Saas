"use client";

import { useEffect, useRef, useState } from "react";
import type { Department } from "@/lib/departments";
import { DepartmentStats } from "@/components/PeopleOS/DepartmentStats";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function renderMarkdownish(text: string) {
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();
    const withBold = (s: string) =>
      s.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        )
      );
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
      return (
        <li key={i} className="ml-4 list-disc">
          {withBold(trimmed.slice(2))}
        </li>
      );
    }
    if (!trimmed) return <div key={i} className="h-1.5" />;
    return <p key={i}>{withBold(line)}</p>;
  });
}

export function DepartmentPanel({
  department,
  enabled,
  onClose,
}: {
  department: Department;
  enabled: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Tracks which department is currently displayed so a response for a department
  // the user has since switched away from can't overwrite the new one's transcript.
  const activeDeptRef = useRef(department.id);

  useEffect(() => {
    activeDeptRef.current = department.id;
    setMessages([]);
    setInput("");
    setThinking(false);
    inputRef.current?.focus();
  }, [department.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || thinking) return;
    const requestDeptId = department.id;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/ai/department-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: requestDeptId, messages: next }),
      });
      const data = await res.json();
      if (activeDeptRef.current !== requestDeptId) return;
      setMessages([
        ...next,
        { role: "assistant", content: res.ok ? data.reply : `⚠️ ${data.error ?? "Something went wrong."}` },
      ]);
    } catch {
      if (activeDeptRef.current !== requestDeptId) return;
      setMessages([...next, { role: "assistant", content: "⚠️ Network error — try again." }]);
    } finally {
      if (activeDeptRef.current === requestDeptId) {
        setThinking(false);
        inputRef.current?.focus();
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
      <div className="px-5 py-4 border-b border-slate-800 flex items-start gap-3 flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: `radial-gradient(circle, ${department.accent}55, transparent 70%)`, border: `1.5px solid ${department.accent}` }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm leading-tight">{department.name}</p>
          <p className="text-slate-400 text-xs mt-0.5">
            Owner: {department.owner} · People Department
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-5 py-3 border-b border-slate-800 flex-shrink-0">
        <p className="text-xs text-slate-400 leading-relaxed">{department.purpose}</p>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {department.responsibilities.map((r) => (
            <span
              key={r}
              className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-300"
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      <DepartmentStats department={department} />

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {!enabled ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm font-medium text-slate-300">This agent is asleep</p>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Add an <code className="bg-slate-800 px-1 rounded">ANTHROPIC_API_KEY</code> environment
              variable and redeploy to wake up the People Department agents.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col justify-end">
            <p className="text-sm text-slate-400 mb-3">
              Ask the {department.name} agent anything within its remit, or try:
            </p>
            <div className="flex flex-col gap-2">
              {department.quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="text-left text-sm bg-slate-800/70 hover:bg-slate-800 text-slate-200
                    px-3 py-2 rounded-lg transition-colors border border-slate-700/50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed space-y-1 ${
                    m.role === "user"
                      ? "text-white rounded-br-md"
                      : "bg-slate-800 text-slate-200 rounded-bl-md"
                  }`}
                  style={m.role === "user" ? { backgroundColor: department.accent } : undefined}
                >
                  {m.role === "assistant" ? renderMarkdownish(m.content) : m.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {enabled && (
        <div className="px-4 py-3 border-t border-slate-800 flex items-center gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder={`Ask ${department.name}…`}
            className="flex-1 text-sm bg-slate-800 border border-slate-700 rounded-full px-4 py-2.5
              text-white focus:outline-none focus:ring-2 placeholder:text-slate-500 min-w-0"
            style={{ ["--tw-ring-color" as string]: `${department.accent}55` }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
            aria-label="Send"
            className="p-2.5 rounded-full text-white disabled:opacity-40 transition-colors flex-shrink-0"
            style={{ backgroundColor: department.accent }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
