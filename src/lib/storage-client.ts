"use client";

import { createClient } from "@/lib/supabase/client";

// Uploads go straight from the browser to Supabase Storage rather than
// through a Next.js Server Action — Server Actions run as Vercel serverless
// functions with a small request-body cap, which real audio files exceed.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // effectively "forever" for a personal app

async function uploadToBucket(bucket: "record-photos" | "record-audio", file: File) {
  const supabase = createClient();
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

export function uploadPhoto(file: File) {
  return uploadToBucket("record-photos", file);
}

export function uploadAudio(file: File) {
  return uploadToBucket("record-audio", file);
}
