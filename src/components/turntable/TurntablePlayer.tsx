"use client";

import { useEffect, useRef, useState } from "react";
import Turntable from "./Turntable";
import { useCrackle } from "./useCrackle";
import type { VinylRecord } from "@/lib/types";

export default function TurntablePlayer({ record }: { record: VinylRecord | null }) {
  const [dropped, setDropped] = useState(false);
  const [rpm45, setRpm45] = useState(false);
  const [crackleOn, setCrackleOn] = useState(true);
  const [loadedId, setLoadedId] = useState(record?.id);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const crackle = useCrackle();

  // A newly loaded record always starts lifted — adjust state during render
  // rather than in an effect, per https://react.dev/learn/you-might-not-need-an-effect
  if (record?.id !== loadedId) {
    setLoadedId(record?.id);
    setDropped(false);
  }

  // Side effects (stopping playback/crackle) belong in an effect.
  useEffect(() => {
    crackle.stop();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id]);

  function drop() {
    if (!record) return;
    setDropped(true);
    if (crackleOn) crackle.start();
    audioRef.current?.play().catch(() => {
      // Playback needs a user gesture on some browsers — the drop is still a gesture, so this is rare.
    });
  }

  function lift() {
    setDropped(false);
    crackle.stop();
    audioRef.current?.pause();
  }

  function toggleCrackle(next: boolean) {
    setCrackleOn(next);
    if (dropped) {
      if (next) crackle.start();
      else crackle.stop();
    }
  }

  const hasAudio = Boolean(record?.audio_url);

  return (
    <section className="flex flex-col items-center pt-5 pb-2">
      <div className="text-center mb-6 min-h-[52px]">
        {record ? (
          <>
            <div className="font-display font-semibold text-xl">{record.title}</div>
            <div className="font-mono text-sm text-teal-deep mt-0.5">{record.artist}</div>
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
      </div>

      <label className="flex items-center gap-2 mt-4 font-mono text-xs text-ink/60">
        <input
          type="checkbox"
          checked={crackleOn}
          onChange={(e) => toggleCrackle(e.target.checked)}
          className="accent-rust"
        />
        vinyl crackle
      </label>

      <div className="font-mono text-[0.7rem] text-ink/45 mt-4.5 text-center max-w-[280px]">
        {record && !hasAudio && "No audio uploaded for this record yet — add one from its detail sheet."}
      </div>

      {record?.audio_url && (
        <audio ref={audioRef} src={record.audio_url} preload="none" />
      )}
    </section>
  );
}
