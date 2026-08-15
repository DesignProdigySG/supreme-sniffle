import { NextRequest, NextResponse } from "next/server";
import { searchPeople } from "@/src/graph/people";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ people: [] });
  }
  try {
    const people = await searchPeople(q.trim());
    return NextResponse.json({ people });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
