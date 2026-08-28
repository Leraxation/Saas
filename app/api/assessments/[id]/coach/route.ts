import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildReport } from "@/lib/assessments/scoring";
import { reportDigest } from "@/lib/assessments/development";
import { getAssessment } from "@/lib/assessments/store";
import { checkRateLimit, redisConfigured } from "@/lib/redis";

export const dynamic = "force-dynamic";

const MAX_MESSAGES = 14;
const MAX_MESSAGE_CHARS = 3000;
const RATE_LIMIT_PER_MINUTE = 12;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function isValidMessages(messages: unknown): messages is ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return false;
  return messages.every(
    (m): m is ChatMessage =>
      typeof m === "object" &&
      m !== null &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.length > 0 &&
      m.content.length <= MAX_MESSAGE_CHARS
  );
}

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Coaching is not configured. Add ANTHROPIC_API_KEY to enable it." },
      { status: 501 }
    );
  }

  const assessment = await getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { messages, audience } = (body ?? {}) as { messages?: unknown; audience?: unknown };
  if (!isValidMessages(messages)) {
    return NextResponse.json({ error: "Invalid message payload." }, { status: 400 });
  }
  const forCoach = audience === "coach";

  if (redisConfigured()) {
    try {
      const within = await checkRateLimit(
        `ratelimit:assessment-coach:${clientIp(request)}`,
        RATE_LIMIT_PER_MINUTE,
        60
      );
      if (!within) {
        return NextResponse.json({ error: "Too many requests — try again in a minute." }, { status: 429 });
      }
    } catch (rateLimitError) {
      console.error("coach rate limit check failed, failing open:", rateLimitError);
    }
  }

  const report = buildReport(assessment);
  const plan = assessment.plan;

  const system = `You are a leadership development coach working from a completed assessment. You are speaking with ${
    forCoach ? "the coach or HR partner supporting this leader" : `${report.participant.name}, the leader who was assessed`
  }.

ASSESSMENT DATA (the only evidence you have — treat it as ground truth):
${reportDigest(report)}
${plan ? `\nAGREED DEVELOPMENT FOCUS: ${plan.focusCompetencies.join(", ")}. Actions already in the plan:\n${plan.actions.map((a) => `- [${a.type}, ${a.horizon}] ${a.action}`).join("\n")}` : "\nNo development plan has been generated yet."}

How you work:
- Coach, do not lecture. Ask before you advise; one question at a time.
- Every observation must trace to a score, a gap or a rater comment above. If something is not in the data, say you do not have it rather than inventing it.
- Scores describe patterns, not verdicts. Never tell them what they "are" — talk about what the evidence shows and what it might mean.
- Keep replies under 150 words unless asked to draft something.
- ${forCoach ? "You may discuss the data analytically, including where the assessment itself is thin (low rater coverage, self-report only)." : "Where 360 raters disagree with the self-rating, hold both views open rather than declaring either correct. Rater comments are anonymised — never speculate about who said what."}
- Use markdown sparingly: bold for emphasis, bullets for a short list.`;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
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
      return NextResponse.json({ error: "The coach is rate-limited — try again in a minute." }, { status: 429 });
    }
    if (e instanceof Anthropic.APIConnectionError) {
      return NextResponse.json({ error: "Could not reach the AI service." }, { status: 502 });
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Coaching request failed (${e.status}).` }, { status: 500 });
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
