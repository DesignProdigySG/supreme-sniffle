import { NextRequest, NextResponse } from "next/server";
import { findShortestPath, findStrongestPath } from "@/src/graph/warmIntro";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const strongest = request.nextUrl.searchParams.get("strongest") === "true";
  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }
  try {
    const path = strongest ? await findStrongestPath(from, to) : await findShortestPath(from, to);
    return NextResponse.json({ path });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
