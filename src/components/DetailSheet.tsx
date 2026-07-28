"use client";

import { useEffect, useRef, useState } from "react";
import Sheet from "./Sheet";
import { usePlayback } from "./turntable/PlaybackProvider";
import { addTrack, deleteRecord, deleteTrack, listTracks, updateTrackAudio } from "@/lib/actions";
import { uploadAudio } from "@/lib/storage-client";
import { formatDuration } from "@/lib/format";
import type { Track, VinylRecord } from "@/lib/types";

export default function DetailSheet({
  record,
  onClose,
  onPlay,
  onDeleted,
}: {
  record: VinylRecord | null;
  onClose: () => void;
  onPlay: (record: VinylRecord) => void;
  onDeleted: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);

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

      <TrackList record={record} busy={busy} setBusy={setBusy} />

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

function TrackList({
  record,
  busy,
  setBusy,
}: {
  record: VinylRecord;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const { refreshTracks } = usePlayback();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset to a loading state as soon as the record we're showing changes —
  // the fetch below only ever touches state from inside its own promise
  // callbacks, never synchronously in the effect body.
  const [loadedRecordId, setLoadedRecordId] = useState(record.id);
  if (record.id !== loadedRecordId) {
    setLoadedRecordId(record.id);
    setLoading(true);
    setTracks([]);
  }

  useEffect(() => {
    let cancelled = false;
    listTracks(record.id)
      .then((t) => {
        if (!cancelled) setTracks(t);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load tracks");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [record.id]);

  async function handleAddTrack() {
    const title = newTitle.trim();
    if (!title) return;
    setBusy(true);
    setError(null);
    try {
      const track = await addTrack(record.id, { title });
      setTracks((prev) => [...prev, track]);
      setNewTitle("");
      refreshTracks(record.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that track");
    } finally {
      setBusy(false);
    }
  }

  async function handleTrackAudio(track: Track, file: File) {
    setBusy(true);
    setError(null);
    try {
      const audioUrl = await uploadAudio(file);
      const updated = await updateTrackAudio(track.id, audioUrl);
      setTracks((prev) => prev.map((t) => (t.id === track.id ? updated : t)));
      refreshTracks(record.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload that file");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveTrack(track: Track) {
    setBusy(true);
    setError(null);
    try {
      await deleteTrack(track.id);
      setTracks((prev) => prev.filter((t) => t.id !== track.id));
      refreshTracks(record.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove that track");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4.5">
      <label className="block font-mono text-[0.68rem] uppercase tracking-[0.05em] text-teal-deep mb-1.5">
        Tracks
      </label>

      {loading ? (
        <p className="font-mono text-xs text-ink/45">Loading…</p>
      ) : tracks.length === 0 ? (
        <p className="font-mono text-xs text-ink/45 mb-2">
          No tracks yet — add one below, or upload audio per track once added.
        </p>
      ) : (
        <ul className="space-y-1.5 mb-2.5">
          {tracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              busy={busy}
              onAudio={(file) => handleTrackAudio(track, file)}
              onRemove={() => handleRemoveTrack(track)}
            />
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddTrack();
          }}
          placeholder="Track title"
          disabled={busy}
          className="flex-1 px-3 py-2 rounded-lg border-[1.5px] border-teal-deep/25 bg-cream-soft text-sm focus:outline-2 focus:outline-teal focus:outline-offset-1"
        />
        <button
          onClick={handleAddTrack}
          disabled={busy || !newTitle.trim()}
          className="shrink-0 rounded-lg bg-teal-deep text-cream-soft font-semibold text-sm px-4 disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {error && <p className="font-mono text-xs text-rust mt-2">{error}</p>}
    </div>
  );
}

function TrackRow({
  track,
  index,
  busy,
  onAudio,
  onRemove,
}: {
  track: Track;
  index: number;
  busy: boolean;
  onAudio: (file: File) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <li className="flex items-center gap-2.5 bg-cream-soft rounded-lg px-2.5 py-2">
      <span className="font-mono text-[0.68rem] text-teal-deep w-5 text-right shrink-0">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-sm truncate">{track.title}</div>
        <div className="font-mono text-[0.65rem] text-ink/45 truncate">
          {track.duration_seconds != null && `${formatDuration(track.duration_seconds)} · `}
          {track.audio_url ? "audio attached" : "no audio"}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAudio(file);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="font-mono text-[0.65rem] shrink-0 text-teal-deep underline disabled:opacity-40"
      >
        {track.audio_url ? "replace" : "add audio"}
      </button>
      <button
        onClick={onRemove}
        disabled={busy}
        className="font-mono text-[0.65rem] shrink-0 text-rust underline disabled:opacity-40"
      >
        remove
      </button>
    </li>
  );
}
