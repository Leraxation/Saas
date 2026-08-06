import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDepartment } from "@/lib/departments";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
    const { departmentId, messages } = (await request.json()) as {
      departmentId: string;
      messages: ChatMessage[];
    };

    const system = buildSystemPrompt(departmentId);
    if (!system) {
      return NextResponse.json({ error: "Unknown department." }, { status: 400 });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
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
