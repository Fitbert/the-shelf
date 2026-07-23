import { NextResponse, type NextRequest } from "next/server";
import { DiscogsError, searchReleases } from "@/lib/discogs";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await searchReleases(q);
    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof DiscogsError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
