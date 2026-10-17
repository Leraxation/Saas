import { NextRequest, NextResponse } from "next/server";
import { addCoachingNote, getAssessment } from "@/lib/assessments/store";
import { cleanString, MAX_NAME, MAX_TEXT } from "@/lib/assessments/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getAssessment(id))) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const author = cleanString(b.author, MAX_NAME);
  const note = cleanString(b.body, MAX_TEXT);
  if (!author || !note) {
    return NextResponse.json(
      { error: `A coach name and a note under ${MAX_TEXT} characters are required.` },
      { status: 400 }
    );
  }

  const updated = await addCoachingNote(id, { author, body: note });
  if (!updated) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }
  return NextResponse.json({ notes: updated.coachingNotes }, { status: 201 });
}
