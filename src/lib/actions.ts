"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { VinylRecord } from "@/lib/types";

const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // effectively "forever" for a personal app

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

export async function deleteRecord(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("records").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

async function uploadToBucket(bucket: "record-photos" | "record-audio", file: File) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const ext = file.name.split(".").pop() || "bin";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: signed, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError) throw new Error(signError.message);

  return signed.signedUrl;
}

export async function uploadPhoto(file: File) {
  return uploadToBucket("record-photos", file);
}

export async function uploadAudio(file: File) {
  return uploadToBucket("record-audio", file);
}

export async function attachAudio(id: string, file: File): Promise<VinylRecord> {
  const audioUrl = await uploadAudio(file);
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
