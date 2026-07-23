export type VinylRecord = {
  id: string;
  title: string;
  artist: string;
  catalog_number: string | null;
  pressing_country: string | null;
  pressing_year: number | null;
  discogs_release_id: string | null;
  lowest_price: number | null;
  have_count: number | null;
  want_count: number | null;
  community_rating: number | null;
  community_rating_count: number | null;
  photo_url: string | null;
  audio_url: string | null;
  created_at: string;
};

export type DiscogsSearchResult = {
  id: number;
  title: string;
  year: string | null;
  thumb: string | null;
  format: string[];
  country: string | null;
  catno: string | null;
  label: string[];
};

export type DiscogsReleaseDetail = {
  id: number;
  title: string;
  artist: string;
  year: string | null;
  country: string | null;
  catalogNumber: string | null;
  label: string | null;
  thumb: string | null;
  lowestPrice: number | null;
  haveCount: number | null;
  wantCount: number | null;
  rating: number | null;
  ratingCount: number | null;
};
