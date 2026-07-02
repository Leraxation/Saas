import { NextResponse } from "next/server";
import { getTasksWithListId } from "@/lib/graph";

export async function GET() {
  try {
    const data = await getTasksWithListId();
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
