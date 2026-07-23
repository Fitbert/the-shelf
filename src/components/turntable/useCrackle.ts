"use client";

import { useRef } from "react";

type CrackleNode = { src: AudioBufferSourceNode; gain: GainNode };

export function useCrackle() {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<CrackleNode | null>(null);

  function start() {
    try {
      if (!ctxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current = new Ctx();
      }
      const ctx = ctxRef.current;
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.002 ? 0.6 : 0.02);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.5;
      src.connect(gain).connect(ctx.destination);
      src.start();
      nodeRef.current = { src, gain };
    } catch {
      // Web Audio unavailable in this environment — crackle is decorative, fail silently.
    }
  }

  function stop() {
    if (nodeRef.current) {
      try {
        nodeRef.current.src.stop();
      } catch {
        // already stopped
      }
      nodeRef.current = null;
    }
  }

  return { start, stop };
}
