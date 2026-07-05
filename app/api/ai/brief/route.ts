import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getEmails, getCalendarEvents, getTasksWithListId } from "@/lib/graph";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a sharp, concise executive assistant writing a daily briefing for a busy professional based on their Outlook data.

Write the briefing as short markdown with:
1. One opening sentence capturing the overall shape of the day.
2. "**Top priorities**" — up to 3 bullets: the most important emails to answer or tasks to do, and why.
3. "**Schedule notes**" — up to 2 bullets: what matters about today's meetings (gaps, conflicts, back-to-backs, prep needed). Skip this section if the calendar is empty.
4. If most unread email is automated noise, say so in one closing sentence so they don't waste time on it.

Rules: be specific (name senders and meeting titles), never invent information not present in the data, no preamble, keep the whole briefing under 150 words.`;

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI briefing is not configured. Add ANTHROPIC_API_KEY to enable it." },
      { status: 501 }
    );
  }

  try {
    const [emailsData, calendarData, tasksData] = await Promise.all([
      getEmails(),
      getCalendarEvents(),
      getTasksWithListId(),
    ]);

    type EmailLike = {
      subject?: string;
      from?: { emailAddress?: { name?: string; address?: string } };
      receivedDateTime?: string;
      isRead?: boolean;
      bodyPreview?: string;
    };
    type EventLike = {
      subject?: string;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
      location?: { displayName?: string };
      isAllDay?: boolean;
    };
    type TaskLike = { title?: string; importance?: string; dueDateTime?: { dateTime?: string } };

    const data = {
      now: new Date().toISOString(),
      emails: ((emailsData.value ?? []) as EmailLike[]).slice(0, 20).map((e) => ({
        from: e.from?.emailAddress?.name ?? e.from?.emailAddress?.address,
        subject: e.subject,
        received: e.receivedDateTime,
        unread: !e.isRead,
        preview: (e.bodyPreview ?? "").slice(0, 150),
      })),
      calendar: ((calendarData.value ?? []) as EventLike[]).map((ev) => ({
        title: ev.subject,
        start: ev.start?.dateTime,
        end: ev.end?.dateTime,
        location: ev.location?.displayName || undefined,
        allDay: ev.isAllDay,
      })),
      tasks: ((tasksData.tasks ?? []) as TaskLike[]).map((t) => ({
        title: t.title,
        importance: t.importance,
        due: t.dueDateTime?.dateTime,
      })),
    };

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Here is my current Outlook data as JSON:\n\n${JSON.stringify(data, null, 2)}\n\nWrite my briefing.`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return NextResponse.json({ briefing: text });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Invalid Anthropic API key." }, { status: 500 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "AI rate limit reached — try again in a minute." },
        { status: 429 }
      );
    }
    if (e instanceof Anthropic.APIConnectionError) {
      return NextResponse.json(
        { error: "Could not reach the AI service. Check your network." },
        { status: 502 }
      );
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `AI request failed (${e.status}).` }, { status: 500 });
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
