"use client";

import { useRef, useState } from "react";
import Sheet from "./Sheet";
import { deleteRecord, updateRecordAudio } from "@/lib/actions";
import { uploadAudio } from "@/lib/storage-client";
import type { VinylRecord } from "@/lib/types";

export default function DetailSheet({
  record,
  onClose,
  onPlay,
  onDeleted,
  onUpdated,
}: {
  record: VinylRecord | null;
  onClose: () => void;
  onPlay: (record: VinylRecord) => void;
  onDeleted: (id: string) => void;
  onUpdated: (record: VinylRecord) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!record) return null;

  async function handleDelete() {
    if (!record) return;
    if (!confirm(`Remove "${record.title}" from the shelf?`)) return;
    setBusy(true);
    try {
      await deleteRecord(record.id);
      onDeleted(record.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !record) return;
    setBusy(true);
    setError(null);
    try {
      const audioUrl = await uploadAudio(file);
      const updated = await updateRecordAudio(record.id, audioUrl);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that file");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Sheet open={Boolean(record)} onClose={onClose}>
      <div className="flex gap-3.5 mb-4">
        <div
          className="w-[88px] h-[88px] rounded-[10px] bg-teal bg-cover bg-center shrink-0"
          style={record.photo_url ? { backgroundImage: `url(${record.photo_url})` } : undefined}
        />
        <div>
          <div className="font-display font-semibold text-[1.05rem]">{record.title}</div>
          <div className="font-mono text-xs text-teal-deep mt-0.5">{record.artist}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4.5">
        {record.catalog_number && (
          <span className="font-mono text-[0.68rem] bg-cream-soft border border-teal-deep/20 px-2.5 py-[5px] rounded-full">
            Cat# {record.catalog_number}
          </span>
        )}
        {record.pressing_country && (
          <span className="font-mono text-[0.68rem] bg-cream-soft border border-teal-deep/20 px-2.5 py-[5px] rounded-full">
            {record.pressing_country}
            {record.pressing_year ? ` · ${record.pressing_year}` : ""}
          </span>
        )}
        {record.have_count != null && (
          <span className="font-mono text-[0.68rem] bg-cream-soft border border-teal-deep/20 px-2.5 py-[5px] rounded-full">
            {record.have_count} have
          </span>
        )}
        {record.want_count != null && (
          <span className="font-mono text-[0.68rem] bg-cream-soft border border-teal-deep/20 px-2.5 py-[5px] rounded-full">
            {record.want_count} want
          </span>
        )}
        {record.community_rating != null && (
          <span className="font-mono text-[0.68rem] bg-cream-soft border border-teal-deep/20 px-2.5 py-[5px] rounded-full">
            ★ {record.community_rating.toFixed(1)}
            {record.community_rating_count ? ` (${record.community_rating_count})` : ""}
          </span>
        )}
        {record.lowest_price != null && (
          <span className="font-mono text-[0.68rem] bg-rust text-cream-soft px-2.5 py-[5px] rounded-full">
            ${record.lowest_price.toFixed(2)} lowest
          </span>
        )}
      </div>

      <div className="mb-4.5">
        <label className="block font-mono text-[0.68rem] uppercase tracking-[0.05em] text-teal-deep mb-1.5">
          Your audio file
        </label>
        {record.audio_url ? (
          <p className="font-mono text-xs text-ink/55">Audio attached — ready to play on the turntable.</p>
        ) : (
          <p className="font-mono text-xs text-ink/45">
            Upload your own rip/conversion of this record to play it on the turntable.
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioChange}
          disabled={busy}
          className="mt-2 text-xs font-mono"
        />
        {error && <p className="font-mono text-xs text-rust mt-2">{error}</p>}
      </div>

      <div className="flex gap-2.5 mt-4.5">
        <button
          onClick={handleDelete}
          disabled={busy}
          className="flex-1 rounded-full bg-transparent text-teal-deep border-[1.5px] border-teal-deep font-semibold text-sm py-2.5 disabled:opacity-40"
        >
          Remove from shelf
        </button>
        <button
          onClick={() => {
            onPlay(record);
            onClose();
          }}
          disabled={busy}
          className="flex-1 rounded-full bg-orange text-ink font-semibold text-sm py-2.5 shadow-[0_4px_12px_rgba(242,163,75,0.4)] disabled:opacity-40"
        >
          Play on turntable
        </button>
      </div>
    </Sheet>
  );
}
