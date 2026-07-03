import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/token";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { listId, taskId } = body;

    // Validate required fields
    if (!listId || typeof listId !== "string" || listId.trim() === "") {
      return NextResponse.json(
        { error: "Invalid or missing listId" },
        { status: 400 }
      );
    }

    if (!taskId || typeof taskId !== "string" || taskId.trim() === "") {
      return NextResponse.json(
        { error: "Invalid or missing taskId" },
        { status: 400 }
      );
    }

    const token = await getAccessToken();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/todo/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Graph API ${res.status}: ${errorText}`);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
