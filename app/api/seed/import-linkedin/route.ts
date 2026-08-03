import { NextRequest, NextResponse } from "next/server";
import { importLinkedInConnectionsFromText } from "@/src/seed/importLinkedin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { csv?: string; ownerPersonId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body.csv || !body.ownerPersonId) {
    return NextResponse.json({ error: '"csv" and "ownerPersonId" are both required.' }, { status: 400 });
  }

  try {
    const result = await importLinkedInConnectionsFromText({ csvRaw: body.csv, ownerPersonId: body.ownerPersonId });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
