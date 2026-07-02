import { NextResponse } from "next/server";
import { getEmails } from "@/lib/graph";

export async function GET() {
  try {
    const data = await getEmails();
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
