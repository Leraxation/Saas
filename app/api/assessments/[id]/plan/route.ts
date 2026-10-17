import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildReport } from "@/lib/assessments/scoring";
import { generatePlan, reportDigest } from "@/lib/assessments/development";
import { getAssessment, savePlan } from "@/lib/assessments/store";
import { checkRateLimit, redisConfigured } from "@/lib/redis";

export const dynamic = "force-dynamic";

const RATE_LIMIT_PER_MINUTE = 6;

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessment = await getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  const report = buildReport(assessment);
  if (!report.completeness.competency) {
    return NextResponse.json(
      { error: "Complete the competency module before generating a development plan." },
      { status: 409 }
    );
  }

  const plan = generatePlan(report);
  const useAi = new URL(request.url).searchParams.get("ai") === "1";

  if (useAi && process.env.ANTHROPIC_API_KEY) {
    if (redisConfigured()) {
      try {
        const within = await checkRateLimit(
          `ratelimit:assessment-plan:${clientIp(request)}`,
          RATE_LIMIT_PER_MINUTE,
          60
        );
        if (!within) {
          return NextResponse.json({ error: "Too many requests — try again in a minute." }, { status: 429 });
        }
      } catch (rateLimitError) {
        // A cost guard should never be the reason a plan cannot be produced.
        console.error("assessment plan rate limit check failed, failing open:", rateLimitError);
      }
    }

    try {
      const client = new Anthropic();
      const response = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1600,
        system:
          "You are an experienced leadership assessment consultant writing the narrative section of a development report. " +
          "Ground every statement in the supplied scores — never invent evidence, a behaviour or an anecdote that is not in the data. " +
          "Write in second person to the leader, in plain professional English, 250-400 words. " +
          "Cover: what the evidence says overall, the two strengths to build from, the two focus areas and why they matter at this level, " +
          "any self-versus-observer gap and how to test it, and any behavioural risk worth watching. " +
          "Use markdown bold for section leads and keep paragraphs short. Do not list the development actions — those are generated separately.",
        messages: [
          {
            role: "user",
            content: `Assessment results:\n\n${reportDigest(report)}\n\nThe generated plan focuses on: ${plan.focusCompetencies.join(", ") || "none identified"}. It builds from: ${plan.leverageCompetencies.join(", ") || "none identified"}.\n\nWrite the narrative.`,
          },
        ],
      });
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();
      if (text) {
        plan.narrative = text;
        plan.source = "ai";
      }
    } catch (e) {
      // The deterministic narrative is a complete plan on its own, so an AI failure
      // degrades the output rather than failing the request.
      console.error("AI narrative generation failed, using generated narrative:", e);
    }
  }

  const updated = await savePlan(id, plan);
  if (!updated) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }
  return NextResponse.json({
    plan,
    aiAvailable: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}
