import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTasksWithListId } from "@/lib/graph";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const data = await getTasksWithListId(session?.accessToken);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
