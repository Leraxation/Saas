import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getEmails, getCalendarEvents, getTasksWithListId } from "@/lib/graph";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are Jarvis, the built-in AI copilot of a personal Outlook dashboard. You have the user's live inbox, calendar, and task data (provided below as JSON).

Personality: capable, warm, lightly witty — a trusted chief-of-staff, never sycophantic or long-winded.

You can:
- Answer questions about their emails, schedule, and tasks ("what needs my attention?", "when am I free?", "what did Sarah say?")
- Draft replies, emails, or messages when asked (present the draft in a quoted block they can copy)
- Prioritize, summarize, and plan their day

Rules:
- Ground every statement in the provided data; if the data doesn't contain the answer, say so plainly.
- Be concise: answer first, detail only if useful. Most replies should be under 100 words unless drafting text.
- Use markdown sparingly (bold for emphasis, bullets for lists).
- You cannot send emails, move meetings, or modify anything — if asked, provide the draft or plan and say the dashboard can't send it yet.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Jarvis is not configured. Add ANTHROPIC_API_KEY to enable it." },
      { status: 501 }
    );
  }

  try {
    const { messages } = (await request.json()) as { messages: ChatMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const [emailsData, calendarData, tasksData] = await Promise.all([
      getEmails(),
      getCalendarEvents(),
      getTasksWithListId(),
    ]);

    const context = {
      now: new Date().toISOString(),
      emails: (emailsData.value ?? []).slice(0, 20),
      calendar: calendarData.value ?? [],
      tasks: tasksData.tasks ?? [],
    };

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: `Current Outlook data:\n${JSON.stringify(context)}` },
      ],
      messages: messages.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return NextResponse.json({ reply: text });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Invalid Anthropic API key." }, { status: 500 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Jarvis is rate-limited — try again in a minute." },
        { status: 429 }
      );
    }
    if (e instanceof Anthropic.APIConnectionError) {
      return NextResponse.json({ error: "Could not reach the AI service." }, { status: 502 });
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Jarvis request failed (${e.status}).` }, { status: 500 });
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
