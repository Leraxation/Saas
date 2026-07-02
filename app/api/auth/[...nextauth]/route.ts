import { NextResponse } from "next/server";

// NextAuth removed — auth is handled via stored refresh token.
export function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
export { GET as POST };
