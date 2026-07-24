import { NextResponse, type NextRequest } from "next/server";
import { DiscogsError, getCollectionPage } from "@/lib/discogs";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim();
  const page = Number(request.nextUrl.searchParams.get("page") || "1") || 1;

  if (!username) {
    return NextResponse.json({ error: "Enter a Discogs username" }, { status: 400 });
  }

  try {
    const collection = await getCollectionPage(username, page);
    return NextResponse.json(collection);
  } catch (err) {
    if (err instanceof DiscogsError) {
      const message =
        err.status === 403
          ? `"${username}"'s collection is private. Make it public in Discogs' privacy settings (or the "All" folder specifically) to import from it.`
          : err.status === 404
            ? `No Discogs user named "${username}".`
            : err.message;
      return NextResponse.json({ error: message }, { status: err.status });
    }
    return NextResponse.json({ error: "Couldn't load that collection" }, { status: 500 });
  }
}
