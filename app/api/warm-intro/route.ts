import { NextRequest, NextResponse } from "next/server";
import { findShortestPath, findStrongestPath } from "@/src/graph/warmIntro";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const strongest = request.nextUrl.searchParams.get("strongest") === "true";
  console.log("[warm-intro] request", { from, to, strongest });
  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }
  const startedAt = Date.now();
  try {
    const path = strongest ? await findStrongestPath(from, to) : await findShortestPath(from, to);
    console.log("[warm-intro] done", { ms: Date.now() - startedAt, found: !!path, hops: path?.length });
    return NextResponse.json({ path });
  } catch (err) {
    console.error("[warm-intro] error", { ms: Date.now() - startedAt, err: err instanceof Error ? err.stack : err });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
