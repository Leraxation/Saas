import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { gMutate } from "@/lib/graph";
import { getAccessToken } from "@/lib/token";

export async function PATCH(request: NextRequest) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing email id" }, { status: 400 });

  try {
    const session = await getServerSession(authOptions);
    const token =
      session?.accessToken ??
      (process.env.MICROSOFT_REFRESH_TOKEN ? await getAccessToken() : null);

    if (!token) {
      return NextResponse.json(
        { error: "Sign in with Microsoft to mark emails read." },
        { status: 401 }
      );
    }

    await gMutate(`/me/messages/${id}`, "PATCH", { isRead: true }, token);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
