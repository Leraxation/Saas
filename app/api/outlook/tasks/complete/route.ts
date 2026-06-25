import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/token";

export async function PATCH(request: NextRequest) {
  const { listId, taskId } = await request.json();
  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/todo/lists/${listId}/tasks/${taskId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      }
    );
    if (!res.ok) throw new Error(`Graph ${res.status}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
