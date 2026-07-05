"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  "What needs my attention?",
  "Summarize my day",
  "When am I free today?",
  "Draft a reply to my latest email",
];

// Minimal SpeechRecognition typings (not in all TS lib versions)
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function renderMarkdownish(text: string) {
  return text.split("\n").map((line, i) => {
    const bolded = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
      return (
        <li key={i} className="ml-4 list-disc">
          {trimmed.slice(2).split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
            ) : (
              part
            )
          )}
        </li>
      );
    }
    if (trimmed.startsWith(">")) {
      return (
        <p key={i} className="border-l-2 border-indigo-300 pl-2 text-gray-600 italic">
          {trimmed.slice(1).trim()}
        </p>
      );
    }
    if (!trimmed) return <div key={i} className="h-1.5" />;
    return <p key={i}>{bolded}</p>;
  });
}

export function JarvisAssistant({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setVoiceSupported(getSpeechRecognition() !== null);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || thinking) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        {
          role: "assistant",
          content: res.ok ? data.reply : `⚠️ ${data.error ?? "Something went wrong."}`,
        },
      ]);
    } catch {
      setMessages([...next, { role: "assistant", content: "⚠️ Network error — try again." }]);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setListening(false);
      if (transcript) send(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <>
      {/* Floating orb */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Jarvis" : "Open Jarvis"}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg shadow-indigo-500/30
          bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white
          flex items-center justify-center transition-transform hover:scale-105 active:scale-95
          ${open ? "" : "animate-pulse-slow"}`}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-md h-[560px] max-h-[calc(100vh-8rem)]
          bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">Jarvis</p>
              <p className="text-indigo-100 text-xs mt-0.5">Your Outlook copilot</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {!enabled ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <svg className="w-10 h-10 text-indigo-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <p className="text-sm font-medium text-gray-700">Jarvis is asleep</p>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Add an <code className="bg-gray-100 px-1 rounded">ANTHROPIC_API_KEY</code> environment
                  variable in Vercel and redeploy to wake him up.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col justify-end">
                <p className="text-sm text-gray-500 mb-3">
                  Hi — I can see your inbox, calendar, and tasks. Ask me anything, or try:
                </p>
                <div className="flex flex-col gap-2">
                  {QUICK_ACTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-left text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700
                        px-3 py-2 rounded-lg transition-colors"
                    >
                      {q}
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
                          ? "bg-indigo-600 text-white rounded-br-md"
                          : "bg-gray-100 text-gray-800 rounded-bl-md"
                      }`}
                    >
                      {m.role === "assistant" ? renderMarkdownish(m.content) : m.content}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          {enabled && (
            <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
              {voiceSupported && (
                <button
                  onClick={toggleVoice}
                  title={listening ? "Stop listening" : "Speak to Jarvis"}
                  className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${
                    listening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder={listening ? "Listening…" : "Ask Jarvis anything…"}
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
                  placeholder:text-gray-400 min-w-0"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || thinking}
                aria-label="Send"
                className="p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700
                  disabled:opacity-40 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
