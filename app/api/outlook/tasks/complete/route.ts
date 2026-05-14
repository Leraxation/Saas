import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId, taskId } = await request.json();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/todo/lists/${listId}/tasks/${taskId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "completed" }),
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to complete task" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
