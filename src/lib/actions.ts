"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Track, VinylRecord } from "@/lib/types";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function listRecords(): Promise<VinylRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as VinylRecord[];
}

export type NewRecordInput = {
  title: string;
  artist: string;
  catalog_number?: string | null;
  pressing_country?: string | null;
  pressing_year?: number | null;
  discogs_release_id?: string | null;
  lowest_price?: number | null;
  have_count?: number | null;
  want_count?: number | null;
  community_rating?: number | null;
  community_rating_count?: number | null;
  photo_url?: string | null;
  audio_url?: string | null;
};

export async function addRecord(input: NewRecordInput): Promise<VinylRecord> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("records")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data as VinylRecord;
}

export async function addRecords(inputs: NewRecordInput[]): Promise<VinylRecord[]> {
  if (inputs.length === 0) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("records")
    .insert(inputs.map((input) => ({ ...input, user_id: user.id })))
    .select();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data as VinylRecord[];
}

export async function deleteRecord(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("records").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function listTracks(recordId: string): Promise<Track[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("record_id", recordId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return data as Track[];
}

export type NewTrackInput = {
  title: string;
  duration_seconds?: number | null;
  audio_url?: string | null;
};

// Appends a single track after whatever's already on the record — used for
// manual entry, where there's no Discogs tracklist to seed from.
export async function addTrack(recordId: string, input: NewTrackInput): Promise<Track> {
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("tracks")
    .select("id", { count: "exact", head: true })
    .eq("record_id", recordId);
  if (countError) throw new Error(countError.message);

  const { data, error } = await supabase
    .from("tracks")
    .insert({ record_id: recordId, position: (count ?? 0) + 1, ...input })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Track;
}

// Bulk-seeds a record's tracklist, e.g. straight from a Discogs release.
export async function addTracks(recordId: string, inputs: NewTrackInput[]): Promise<Track[]> {
  if (inputs.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracks")
    .insert(inputs.map((input, i) => ({ record_id: recordId, position: i + 1, ...input })))
    .select();
  if (error) throw new Error(error.message);
  return data as Track[];
}

export async function updateTrackAudio(trackId: string, audioUrl: string): Promise<Track> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracks")
    .update({ audio_url: audioUrl })
    .eq("id", trackId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Track;
}

export async function deleteTrack(trackId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tracks").delete().eq("id", trackId);
  if (error) throw new Error(error.message);
}
