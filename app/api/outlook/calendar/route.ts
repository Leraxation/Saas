import { NextResponse } from "next/server";
import { getCalendarEvents } from "@/lib/graph";

export async function GET() {
  try {
    const data = await getCalendarEvents();
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
