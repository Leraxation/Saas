import { NextRequest, NextResponse } from "next/server";
import { getSessionSafe } from "@/lib/auth";
import { gMutate } from "@/lib/graph";
import { getAccessToken } from "@/lib/token";

export async function PATCH(request: NextRequest) {
  const { listId, taskId } = await request.json();
  try {
    const session = await getSessionSafe();
    const token =
      session?.accessToken ??
      (process.env.MICROSOFT_REFRESH_TOKEN ? await getAccessToken() : null);

    if (!token) {
      return NextResponse.json(
        { error: "Sign in with Microsoft to complete tasks." },
        { status: 401 }
      );
    }

    await gMutate(`/me/todo/lists/${listId}/tasks/${taskId}`, "PATCH", { status: "completed" }, token);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
