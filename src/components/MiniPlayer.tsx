"use client";

import { usePlayback } from "./turntable/PlaybackProvider";

export default function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const { record, dropped, hasAudio, currentTime, duration, currentTrack, trackCount, drop, lift } =
    usePlayback();

  if (!record) return null;

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <button
      onClick={onOpen}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[420px] bg-cream-soft rounded-2xl shadow-[0_6px_20px_rgba(36,28,21,0.18)] border border-ink/[0.06] overflow-hidden text-left z-10"
    >
      {hasAudio && (
        <div className="h-[3px] bg-teal-deep/15">
          <div className="h-full bg-teal-deep" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <div
          className="w-9 h-9 rounded-full bg-rust bg-cover bg-center shrink-0"
          style={record.photo_url ? { backgroundImage: `url(${record.photo_url})` } : undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="font-display font-semibold text-sm truncate">{record.title}</div>
          <div className="font-mono text-[0.68rem] text-teal-deep truncate">
            {record.artist}
            {trackCount > 1 && currentTrack?.title ? ` · ${currentTrack.title}` : ""}
          </div>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            if (dropped) lift();
            else drop();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              if (dropped) lift();
              else drop();
            }
          }}
          className="w-9 h-9 rounded-full bg-teal-deep text-cream-soft flex items-center justify-center shrink-0 text-sm"
          aria-label={dropped ? "Lift the needle" : "Drop the needle"}
        >
          {dropped ? "❙❙" : "▶"}
        </span>
      </div>
    </button>
  );
}
