import { NextRequest, NextResponse } from "next/server";
import { redisSet } from "@/lib/redis";

export async function POST(request: NextRequest) {
  if (request.headers.get("x-webhook-secret") !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const events = body.value ?? body;
  await redisSet("pa:calendar", events);
  await redisSet("pa:syncedAt", Date.now());
  return NextResponse.json({ ok: true, count: events.length });
}
