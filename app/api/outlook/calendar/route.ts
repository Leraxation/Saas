import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/graph";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await getCalendarEvents(session.accessToken);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 });
  }
}
