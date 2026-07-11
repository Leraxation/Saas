import { NextResponse } from "next/server";
import { getSessionSafe } from "@/lib/auth";
import { getEmails } from "@/lib/graph";

export async function GET() {
  try {
    const session = await getSessionSafe();
    const data = await getEmails(session?.accessToken);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
