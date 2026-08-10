import { NextRequest, NextResponse } from "next/server";
import { getSessionSafe } from "@/lib/auth";
import { getDepartment } from "@/lib/departments";
import { getDepartmentData, setDepartmentData, type DepartmentDataPatch } from "@/lib/hrData";
import { redisConfigured } from "@/lib/redis";

export const dynamic = "force-dynamic";

const MAX_OPEN_ITEMS = 12;
const MAX_ITEM_CHARS = 140;
const MAX_NOTE_CHARS = 400;
const MAX_HEADCOUNT = 500;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getDepartment(id)) {
    return NextResponse.json({ error: "Unknown department." }, { status: 404 });
  }
  const data = await getDepartmentData(id);
  const session = await getSessionSafe();
  return NextResponse.json({ data, editable: redisConfigured() && Boolean(session?.accessToken) });
}

function isValidPatch(body: unknown): body is DepartmentDataPatch {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;

  if (b.headcountFilled !== undefined) {
    if (
      typeof b.headcountFilled !== "number" ||
      !Number.isInteger(b.headcountFilled) ||
      b.headcountFilled < 0 ||
      b.headcountFilled > MAX_HEADCOUNT
    ) {
      return false;
    }
  }
  if (b.headcountOpen !== undefined) {
    if (
      typeof b.headcountOpen !== "number" ||
      !Number.isInteger(b.headcountOpen) ||
      b.headcountOpen < 0 ||
      b.headcountOpen > MAX_HEADCOUNT
    ) {
      return false;
    }
  }
  if (b.openItems !== undefined) {
    if (!Array.isArray(b.openItems) || b.openItems.length > MAX_OPEN_ITEMS) return false;
    if (!b.openItems.every((item) => typeof item === "string" && item.length <= MAX_ITEM_CHARS)) {
      return false;
    }
  }
  if (b.note !== undefined) {
    if (typeof b.note !== "string" || b.note.length > MAX_NOTE_CHARS) return false;
  }
  return true;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getDepartment(id)) {
    return NextResponse.json({ error: "Unknown department." }, { status: 404 });
  }
  if (!redisConfigured()) {
    return NextResponse.json(
      { error: "No database configured — set UPSTASH_REDIS_REST_URL/TOKEN to make this editable." },
      { status: 501 }
    );
  }
  const session = await getSessionSafe();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Sign in with Microsoft to edit this data." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!isValidPatch(body)) {
    return NextResponse.json({ error: "Invalid patch payload." }, { status: 400 });
  }

  const data = await setDepartmentData(id, body);
  return NextResponse.json({ data });
}
