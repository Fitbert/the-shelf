import { NextResponse } from "next/server";
import { DiscogsError, getReleaseDetail } from "@/lib/discogs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const release = await getReleaseDetail(id);
    return NextResponse.json({ release });
  } catch (err) {
    if (err instanceof DiscogsError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
