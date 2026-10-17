import { NextRequest, NextResponse } from "next/server";
import { addRaters, getAssessment, isRelationship, removeRater } from "@/lib/assessments/store";
import { cleanString, isEmail, MAX_EMAIL, MAX_NAME } from "@/lib/assessments/validation";
import type { RaterInvite } from "@/lib/assessments/store";

export const dynamic = "force-dynamic";

const MAX_RATERS = 20;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessment = await getAssessment(id);
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = (body as { raters?: unknown })?.raters;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_RATERS) {
    return NextResponse.json({ error: `Provide between 1 and ${MAX_RATERS} raters.` }, { status: 400 });
  }
  if (assessment.raters.length + raw.length > MAX_RATERS) {
    return NextResponse.json(
      { error: `A participant can have at most ${MAX_RATERS} raters.` },
      { status: 409 }
    );
  }

  const invites: RaterInvite[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) {
      return NextResponse.json({ error: "Each rater must be an object." }, { status: 400 });
    }
    const e = entry as Record<string, unknown>;
    const name = cleanString(e.name, MAX_NAME);
    const email = cleanString(e.email, MAX_EMAIL);
    if (!name || !email || !isEmail(email) || !isRelationship(e.relationship)) {
      return NextResponse.json(
        { error: "Each rater needs a name, a valid email and a relationship." },
        { status: 400 }
      );
    }
    if (assessment.raters.some((r) => r.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: `${email} is already a rater for this participant.` }, { status: 409 });
    }
    if (invites.some((i) => i.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: `${email} appears twice in this request.` }, { status: 400 });
    }
    invites.push({ name, email, relationship: e.relationship });
  }

  const updated = await addRaters(id, invites);
  if (!updated) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  const added = updated.raters.slice(-invites.length);
  return NextResponse.json(
    {
      // The invitation link is returned once, at invite time, for the administrator to send on.
      raters: added.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        relationship: r.relationship,
        link: `/feedback/${r.token}`,
      })),
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raterId = new URL(request.url).searchParams.get("raterId");
  if (!raterId) {
    return NextResponse.json({ error: "raterId is required." }, { status: 400 });
  }
  const updated = await removeRater(id, raterId);
  if (!updated) {
    return NextResponse.json(
      { error: "Rater not found, or has already submitted feedback." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
