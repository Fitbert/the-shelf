"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useCrackle } from "./useCrackle";
import { listTracks } from "@/lib/actions";
import type { Track, VinylRecord } from "@/lib/types";

type PlaylistItem = {
  id: string;
  title: string;
  duration_seconds: number | null;
  audio_url: string | null;
};

type PlaybackContextValue = {
  record: VinylRecord | null;
  dropped: boolean;
  rpm45: boolean;
  crackleOn: boolean;
  currentTime: number;
  duration: number;
  hasAudio: boolean;
  currentTrack: PlaylistItem | null;
  trackIndex: number;
  trackCount: number;
  hasNextTrack: boolean;
  hasPreviousTrack: boolean;
  load: (record: VinylRecord) => void;
  refreshTracks: (recordId: string) => void;
  drop: () => void;
  lift: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
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
// API so play/pause/seek/track-skip work from the OS lock screen and
// bluetooth controls.
export default function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [record, setRecord] = useState<VinylRecord | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [dropped, setDropped] = useState(false);
  const [rpm45, setRpm45] = useState(false);
  const [crackleOn, setCrackleOn] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const crackle = useCrackle();

  // A record with individual tracks plays those; a record with none falls
  // back to its own audio_url as a single implicit track, so older records
  // (added before Phase 2) keep working without needing a migration.
  const playlist: PlaylistItem[] = useMemo(() => {
    if (tracks.length > 0) return tracks;
    if (record?.audio_url) {
      return [{ id: "legacy", title: record.title, duration_seconds: null, audio_url: record.audio_url }];
    }
    return [];
  }, [tracks, record]);

  const currentTrack = playlist[trackIndex] ?? null;

  // The "ended" listener (registered once, below) needs a live view of the
  // playlist length without being in its dependency array.
  const playlistRef = useRef(playlist);
  useEffect(() => {
    playlistRef.current = playlist;
  });

  // Identifies "which record is loaded" — changing this is a real record
  // swap: reset to the first track, lifted.
  const recordKey = record?.id ?? "";
  const [loadedRecordKey, setLoadedRecordKey] = useState(recordKey);
  if (recordKey !== loadedRecordKey) {
    setLoadedRecordKey(recordKey);
    setDropped(false);
    setTrackIndex(0);
    setTracks([]);
  }

  // Identifies "what's actually in the audio element" — changes on record
  // swap, track skip, or newly attached audio for the current track.
  const sourceKey = currentTrack ? `${currentTrack.id}:${currentTrack.audio_url ?? ""}` : "";
  const [loadedSourceKey, setLoadedSourceKey] = useState(sourceKey);
  if (sourceKey !== loadedSourceKey) {
    setLoadedSourceKey(sourceKey);
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

  // Re-fetches tracks for a record if it's the one currently on the platter —
  // called after track add/remove/audio-upload from the detail sheet so the
  // player picks up the change immediately.
  function refreshTracks(recordId: string) {
    if (record?.id !== recordId) return;
    listTracks(recordId)
      .then(setTracks)
      .catch(() => {});
  }

  function nextTrack() {
    setTrackIndex((i) => Math.min(i + 1, Math.max(playlist.length - 1, 0)));
  }

  function previousTrack() {
    setTrackIndex((i) => Math.max(i - 1, 0));
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

  // Load this record's tracks whenever the loaded record actually changes,
  // and stop the crackle noise (a new record always starts lifted).
  useEffect(() => {
    crackle.stop();
    if (!recordKey) return;
    let cancelled = false;
    listTracks(recordKey)
      .then((t) => {
        if (!cancelled) setTracks(t);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordKey]);

  // Keep a ref to the latest handlers so the one-time effects below (media
  // session registration, audio element listeners) never see stale closures.
  const latestRef = useRef({ drop, lift, seek, nextTrack, previousTrack });
  useEffect(() => {
    latestRef.current = { drop, lift, seek, nextTrack, previousTrack };
  });

  // (Re)load the audio element whenever the actual playable source changes.
  // If we were mid-playback (e.g. skipping to the next track), keep going —
  // that's what makes an album play straight through.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.load();
    if (dropped) {
      audio.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  // Audio element event listeners — attached once since the element itself
  // never unmounts.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => {
      setTrackIndex((i) => {
        const next = i + 1;
        if (next < playlistRef.current.length) return next;
        latestRef.current.lift();
        return i;
      });
    };

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
    navigator.mediaSession.setActionHandler("nexttrack", () => latestRef.current.nextTrack());
    navigator.mediaSession.setActionHandler("previoustrack", () => latestRef.current.previousTrack());
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
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
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
      title: currentTrack?.title ?? record.title,
      artist: record.artist,
      album: record.title,
      artwork: record.photo_url
        ? [
            { src: record.photo_url, sizes: "512x512", type: "image/jpeg" },
            { src: record.photo_url, sizes: "192x192", type: "image/jpeg" },
          ]
        : [],
    });
    navigator.mediaSession.playbackState = dropped ? "playing" : "paused";
  }, [record, currentTrack, dropped]);

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
        hasAudio: Boolean(currentTrack?.audio_url),
        currentTrack,
        trackIndex,
        trackCount: playlist.length,
        hasNextTrack: trackIndex < playlist.length - 1,
        hasPreviousTrack: trackIndex > 0,
        load,
        refreshTracks,
        drop,
        lift,
        nextTrack,
        previousTrack,
        setRpm45,
        setCrackleOn: handleCrackleToggle,
        seek,
      }}
    >
      {children}
      {/* Always mounted (not conditional on having a record) so the listener-attaching
          effect below — which runs once — has a real element to attach to. */}
      <audio ref={audioRef} src={currentTrack?.audio_url || undefined} preload="none" />
    </PlaybackContext.Provider>
  );
}
