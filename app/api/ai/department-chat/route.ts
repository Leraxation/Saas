import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDepartment } from "@/lib/departments";
import { checkRateLimit, redisConfigured } from "@/lib/redis";

export const dynamic = "force-dynamic";

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 4000;
const RATE_LIMIT_PER_MINUTE = 12;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function isValidMessages(messages: unknown): messages is ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return false;
  }
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

function buildSystemPrompt(departmentId: string): string | null {
  const dept = getDepartment(departmentId);
  if (!dept) return null;

  return `You are the AI agent for the "${dept.name}" function inside Oman Air's People Department, reporting up to the CPO. The human owner of this function is ${dept.owner === "Vacant" ? "currently vacant — you are standing in until it's filled" : dept.owner}.

Purpose: ${dept.purpose}

Your remit covers exactly these responsibilities: ${dept.responsibilities.join(", ")}.

Personality: a sharp, professional HR specialist in this domain — practical, concise, never generic corporate filler.

Rules:
- Stay inside your remit. If a question belongs to a different People Department function, say so plainly and name which one, rather than answering outside your lane.
- You have no live company data connected yet — don't invent specific employee names, numbers, or records. Speak in terms of process, policy, and best practice, and say when something would require real data you don't have.
- Be concise: most replies under 120 words unless the user asks you to draft something (a policy, message, plan) — then give the full draft in a quoted block.
- Use markdown sparingly (bold for emphasis, bullets for lists).`;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "This agent is not configured. Add ANTHROPIC_API_KEY to enable it." },
      { status: 501 }
    );
  }

  try {
    if (redisConfigured()) {
      // Rate limiting is a best-effort cost guard, not core functionality — never let it
      // take down chat itself (e.g. a Redis token scoped without write access).
      try {
        const within = await checkRateLimit(
          `ratelimit:department-chat:${clientIp(request)}`,
          RATE_LIMIT_PER_MINUTE,
          60
        );
        if (!within) {
          return NextResponse.json(
            { error: "Too many requests — try again in a minute." },
            { status: 429 }
          );
        }
      } catch (rateLimitError) {
        console.error("department-chat rate limit check failed, failing open:", rateLimitError);
      }
    }

    const { departmentId, messages } = (await request.json()) as {
      departmentId: string;
      messages: unknown;
    };

    const system = buildSystemPrompt(departmentId);
    if (!system) {
      return NextResponse.json({ error: "Unknown department." }, { status: 400 });
    }
    if (!isValidMessages(messages)) {
      return NextResponse.json({ error: "Invalid message payload." }, { status: 400 });
    }

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: messages.map((m) => ({
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
        { error: "This agent is rate-limited — try again in a minute." },
        { status: 429 }
      );
    }
    if (e instanceof Anthropic.APIConnectionError) {
      return NextResponse.json({ error: "Could not reach the AI service." }, { status: 502 });
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Agent request failed (${e.status}).` }, { status: 500 });
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
