import { NextRequest, NextResponse } from "next/server";
import { getBuyingGroup } from "@/src/graph/buyingGroup";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }
  try {
    const members = await getBuyingGroup(accountId);
    return NextResponse.json({ members });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
