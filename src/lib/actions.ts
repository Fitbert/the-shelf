"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { VinylRecord } from "@/lib/types";

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

// File bytes never pass through here — they're uploaded client-side straight
// to Supabase Storage (src/lib/storage-client.ts). This just persists the
// resulting URL, a tiny payload well under any serverless body-size limit.
export async function updateRecordAudio(id: string, audioUrl: string): Promise<VinylRecord> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("records")
    .update({ audio_url: audioUrl })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data as VinylRecord;
}
