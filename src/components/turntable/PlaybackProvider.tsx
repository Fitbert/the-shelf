"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useCrackle } from "./useCrackle";
import type { VinylRecord } from "@/lib/types";

type PlaybackContextValue = {
  record: VinylRecord | null;
  dropped: boolean;
  rpm45: boolean;
  crackleOn: boolean;
  currentTime: number;
  duration: number;
  hasAudio: boolean;
  load: (record: VinylRecord) => void;
  updateIfCurrent: (record: VinylRecord) => void;
  drop: () => void;
  lift: () => void;
  setRpm45: (value: boolean) => void;
  setCrackleOn: (value: boolean) => void;
  seek: (time: number) => void;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error("usePlayback must be used within a PlaybackProvider");
  return ctx;
}

// Owns the single <audio> element and playback state for the whole app, so
// music keeps playing across tab switches instead of unmounting with
// whichever view happened to render the player. Also wires the Media Session
// API so play/pause/seek work from the OS lock screen and bluetooth controls.
export default function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [record, setRecord] = useState<VinylRecord | null>(null);
  const [dropped, setDropped] = useState(false);
  const [rpm45, setRpm45] = useState(false);
  const [crackleOn, setCrackleOn] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const crackle = useCrackle();

  // Identifies "what's currently loaded into the audio element" — changes
  // when a different record loads, or when audio gets attached/replaced on
  // the same record.
  const audioKey = record ? `${record.id}:${record.audio_url ?? ""}` : "";
  const [loadedKey, setLoadedKey] = useState(audioKey);

  // A newly loaded record always starts lifted — adjust state during render
  // rather than in an effect, per https://react.dev/learn/you-might-not-need-an-effect
  if (audioKey !== loadedKey) {
    setLoadedKey(audioKey);
    setDropped(false);
    setCurrentTime(0);
    setDuration(0);
  }

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

  function load(next: VinylRecord) {
    setRecord(next);
  }

  // For when the currently-loaded record's data changes elsewhere (e.g. an
  // audio file gets attached from its detail sheet) without treating it as
  // loading a new record — playback position/dropped state is preserved.
  function updateIfCurrent(updated: VinylRecord) {
    setRecord((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  function seek(time: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }

  function handleCrackleToggle(next: boolean) {
    setCrackleOn(next);
    if (dropped) {
      if (next) crackle.start();
      else crackle.stop();
    }
  }

  // (Re)load the audio element whenever what's loaded changes. State resets
  // for this happen above, during render — this effect only touches the
  // actual audio element and the crackle noise generator.
  useEffect(() => {
    crackle.stop();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioKey]);

  // Keep a ref to the latest handlers so the one-time effects below (media
  // session registration, audio element listeners) never see stale closures.
  const latestRef = useRef({ drop, lift, seek });
  useEffect(() => {
    latestRef.current = { drop, lift, seek };
  });

  // Audio element event listeners — attached once since the element itself
  // never unmounts.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => latestRef.current.lift();

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  // Register Media Session action handlers once — lock screen / bluetooth /
  // headphone controls call into these.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => latestRef.current.drop());
    navigator.mediaSession.setActionHandler("pause", () => latestRef.current.lift());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) latestRef.current.seek(details.seekTime);
    });
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      const audio = audioRef.current;
      if (!audio) return;
      latestRef.current.seek(Math.max(0, audio.currentTime - (details.seekOffset || 10)));
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      const audio = audioRef.current;
      if (!audio) return;
      latestRef.current.seek(audio.currentTime + (details.seekOffset || 10));
    });
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("seekto", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
    };
  }, []);

  // Keep Media Session metadata/state in sync with what's actually loaded.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!record) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: record.title,
      artist: record.artist,
      album: "The Shelf",
      artwork: record.photo_url
        ? [
            { src: record.photo_url, sizes: "512x512", type: "image/jpeg" },
            { src: record.photo_url, sizes: "192x192", type: "image/jpeg" },
          ]
        : [],
    });
    navigator.mediaSession.playbackState = dropped ? "playing" : "paused";
  }, [record, dropped]);

  // Report position so OS-level scrubbers (lock screen, Control Center) stay accurate.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !("setPositionState" in navigator.mediaSession)) return;
    if (!duration || !Number.isFinite(duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch {
      // Some browsers throw if called with stale/invalid values mid-seek — safe to ignore.
    }
  }, [duration, currentTime]);

  return (
    <PlaybackContext.Provider
      value={{
        record,
        dropped,
        rpm45,
        crackleOn,
        currentTime,
        duration,
        hasAudio: Boolean(record?.audio_url),
        load,
        updateIfCurrent,
        drop,
        lift,
        setRpm45,
        setCrackleOn: handleCrackleToggle,
        seek,
      }}
    >
      {children}
      {/* Always mounted (not conditional on having a record) so the listener-attaching
          effect below — which runs once — has a real element to attach to. */}
      <audio ref={audioRef} src={record?.audio_url || undefined} preload="none" />
    </PlaybackContext.Provider>
  );
}
