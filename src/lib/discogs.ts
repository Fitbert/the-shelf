import type { DiscogsReleaseDetail, DiscogsSearchResult } from "@/lib/types";

const BASE = "https://api.discogs.com";

type CacheEntry = { at: number; value: unknown };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(path: string) {
  return path;
}

async function discogsFetch<T>(path: string): Promise<T> {
  const key = cacheKey(path);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value as T;
  }

  const consumerKey = process.env.DISCOGS_CONSUMER_KEY;
  const consumerSecret = process.env.DISCOGS_CONSUMER_SECRET;
  const userAgent = process.env.DISCOGS_USER_AGENT || "TheShelf/1.0";
  if (!consumerKey || !consumerSecret) {
    throw new DiscogsError(
      "Discogs isn't configured yet — set DISCOGS_CONSUMER_KEY and DISCOGS_CONSUMER_SECRET in your environment.",
      500
    );
  }

  // Discogs' simple key/secret auth (no OAuth handshake) — meant for a single-owner app like this one.
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}key=${consumerKey}&secret=${consumerSecret}`;
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent },
    // Discogs data changes slowly; a short server cache also protects the 60 req/min budget.
    next: { revalidate: 300 },
  });

  if (res.status === 429) {
    throw new DiscogsError("Discogs rate limit hit — try again in a moment.", 429);
  }
  if (!res.ok) {
    throw new DiscogsError(`Discogs request failed (${res.status})`, res.status);
  }

  const value = (await res.json()) as T;
  cache.set(key, { at: Date.now(), value });
  return value;
}

export class DiscogsError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type DiscogsSearchResponse = {
  results: Array<{
    id: number;
    title: string;
    year?: string;
    thumb?: string;
    format?: string[];
    country?: string;
    catno?: string;
    label?: string[];
    type: string;
  }>;
};

export async function searchReleases(query: string): Promise<DiscogsSearchResult[]> {
  const data = await discogsFetch<DiscogsSearchResponse>(
    `/database/search?type=release&q=${encodeURIComponent(query)}&per_page=25`
  );
  return data.results.map((r) => ({
    id: r.id,
    title: r.title,
    year: r.year ?? null,
    thumb: r.thumb || null,
    format: r.format ?? [],
    country: r.country ?? null,
    catno: r.catno ?? null,
    label: r.label ?? [],
  }));
}

export async function searchByBarcode(upc: string): Promise<DiscogsSearchResult[]> {
  const data = await discogsFetch<DiscogsSearchResponse>(
    `/database/search?type=release&barcode=${encodeURIComponent(upc)}&per_page=25`
  );
  return data.results.map((r) => ({
    id: r.id,
    title: r.title,
    year: r.year ?? null,
    thumb: r.thumb || null,
    format: r.format ?? [],
    country: r.country ?? null,
    catno: r.catno ?? null,
    label: r.label ?? [],
  }));
}

type DiscogsReleaseResponse = {
  id: number;
  title: string;
  artists_sort?: string;
  year?: number;
  country?: string;
  thumb?: string;
  images?: Array<{ uri: string }>;
  labels?: Array<{ name: string; catno: string }>;
  community?: { have?: number; want?: number; rating?: { average?: number; count?: number } };
};

type DiscogsMarketplaceStats = {
  lowest_price?: { value?: number } | number | null;
  num_for_sale?: number;
};

export async function getReleaseDetail(id: string): Promise<DiscogsReleaseDetail> {
  const [release, stats] = await Promise.all([
    discogsFetch<DiscogsReleaseResponse>(`/releases/${id}`),
    discogsFetch<DiscogsMarketplaceStats>(`/marketplace/stats/${id}?curr_abbr=USD`).catch(
      () => ({ lowest_price: null }) as DiscogsMarketplaceStats
    ),
  ]);

  const label = release.labels?.[0];
  const lowestPrice =
    typeof stats.lowest_price === "number"
      ? stats.lowest_price
      : stats.lowest_price?.value ?? null;

  return {
    id: release.id,
    title: release.title,
    artist: release.artists_sort || "",
    year: release.year ? String(release.year) : null,
    country: release.country ?? null,
    catalogNumber: label?.catno ?? null,
    label: label?.name ?? null,
    thumb: release.thumb || release.images?.[0]?.uri || null,
    lowestPrice,
    haveCount: release.community?.have ?? null,
    wantCount: release.community?.want ?? null,
    rating: release.community?.rating?.average ?? null,
    ratingCount: release.community?.rating?.count ?? null,
  };
}
