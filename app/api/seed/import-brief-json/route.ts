import { NextRequest, NextResponse } from "next/server";
import { importBriefJsonData, type WhenAccountBrief } from "@/src/seed/importBriefJson";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let brief: WhenAccountBrief;
  try {
    brief = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!brief?.account?.name || !Array.isArray(brief.buying_group)) {
    return NextResponse.json(
      { error: 'Expected a WHEN brief with "account.name" and a "buying_group" array.' },
      { status: 400 },
    );
  }

  try {
    const result = await importBriefJsonData(brief);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
