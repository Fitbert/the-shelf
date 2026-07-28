"use client";

import Turntable from "./Turntable";
import { usePlayback } from "./PlaybackProvider";
import { formatDuration } from "@/lib/format";

function formatTime(seconds: number) {
  return formatDuration(seconds) || "0:00";
}

export default function TurntablePlayer() {
  const {
    record,
    dropped,
    rpm45,
    crackleOn,
    currentTime,
    duration,
    hasAudio,
    currentTrack,
    trackIndex,
    trackCount,
    hasNextTrack,
    hasPreviousTrack,
    drop,
    lift,
    nextTrack,
    previousTrack,
    setRpm45,
    setCrackleOn,
    seek,
  } = usePlayback();

  return (
    <section className="flex flex-col items-center pt-5 pb-2">
      <div className="text-center mb-6 min-h-[52px]">
        {record ? (
          <>
            <div className="font-display font-semibold text-xl">{record.title}</div>
            <div className="font-mono text-sm text-teal-deep mt-0.5">{record.artist}</div>
            {trackCount > 1 && (
              <div className="font-mono text-[0.7rem] text-ink/45 mt-1">
                Track {trackIndex + 1} of {trackCount}
                {currentTrack?.title ? ` · ${currentTrack.title}` : ""}
              </div>
            )}
          </>
        ) : (
          <div className="font-mono text-sm text-ink/45">
            Nothing on the platter — pick a record from the shelf
          </div>
        )}
      </div>

      <div className="py-1.5 pb-5">
        <Turntable
          title={record?.title ?? null}
          photoUrl={record?.photo_url ?? null}
          loaded={Boolean(record)}
          spinning={dropped}
          dropped={dropped}
          rpm45={rpm45}
          onDrop={drop}
          onLift={lift}
        />
      </div>

      {hasAudio && (
        <div className="w-full max-w-[320px] flex items-center gap-2 mb-1">
          <span className="font-mono text-[0.65rem] text-ink/50 w-9 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 accent-teal-deep"
          />
          <span className="font-mono text-[0.65rem] text-ink/50 w-9">{formatTime(duration)}</span>
        </div>
      )}

      <div className="flex gap-2.5 items-center mt-3.5 flex-wrap justify-center">
        <div className="flex gap-1 bg-cream-soft rounded-full p-[3px] border border-teal-deep/25">
          <button
            className={`font-mono text-[0.66rem] rounded-full px-[11px] py-[7px] transition-all ${
              !rpm45 ? "bg-teal-deep text-cream-soft" : "text-teal-deep opacity-50"
            }`}
            onClick={() => setRpm45(false)}
          >
            33⅓
          </button>
          <button
            className={`font-mono text-[0.66rem] rounded-full px-[11px] py-[7px] transition-all ${
              rpm45 ? "bg-teal-deep text-cream-soft" : "text-teal-deep opacity-50"
            }`}
            onClick={() => setRpm45(true)}
          >
            45
          </button>
        </div>

        {trackCount > 1 && (
          <button
            className="rounded-full bg-transparent text-teal-deep border-[1.5px] border-teal-deep font-semibold text-[0.85rem] px-3.5 py-[11px] disabled:opacity-35 transition-transform active:scale-[0.96]"
            disabled={!hasPreviousTrack}
            onClick={previousTrack}
            aria-label="Previous track"
          >
            ⏮
          </button>
        )}
        <button
          className="rounded-full bg-orange text-ink font-semibold text-[0.85rem] px-5 py-[11px] shadow-[0_4px_12px_rgba(242,163,75,0.4)] disabled:opacity-35 disabled:shadow-none transition-transform active:scale-[0.96]"
          disabled={!record || dropped}
          onClick={drop}
        >
          Drop the needle
        </button>
        <button
          className="rounded-full bg-transparent text-teal-deep border-[1.5px] border-teal-deep font-semibold text-[0.85rem] px-5 py-[11px] disabled:opacity-35 transition-transform active:scale-[0.96]"
          disabled={!dropped}
          onClick={lift}
        >
          Lift
        </button>
        {trackCount > 1 && (
          <button
            className="rounded-full bg-transparent text-teal-deep border-[1.5px] border-teal-deep font-semibold text-[0.85rem] px-3.5 py-[11px] disabled:opacity-35 transition-transform active:scale-[0.96]"
            disabled={!hasNextTrack}
            onClick={nextTrack}
            aria-label="Next track"
          >
            ⏭
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 mt-4 font-mono text-xs text-ink/60">
        <input
          type="checkbox"
          checked={crackleOn}
          onChange={(e) => setCrackleOn(e.target.checked)}
          className="accent-rust"
        />
        vinyl crackle
      </label>

      <div className="font-mono text-[0.7rem] text-ink/45 mt-4.5 text-center max-w-[280px]">
        {record && !hasAudio && "No audio uploaded for this record yet — add one from its detail sheet."}
      </div>
    </section>
  );
}
