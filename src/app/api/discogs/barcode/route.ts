import { NextResponse, type NextRequest } from "next/server";
import { DiscogsError, searchByBarcode } from "@/lib/discogs";

export async function GET(request: NextRequest) {
  const upc = request.nextUrl.searchParams.get("upc")?.trim();
  if (!upc) return NextResponse.json({ results: [] });

  try {
    const results = await searchByBarcode(upc);
    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof DiscogsError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
