"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Playback clock for the cascade film. The canonical position lives in a ref so
 * the canvas can read it at 60fps without forcing React re-renders; a throttled
 * copy (`p`) drives the chrome (scrubber handle, clock readout).
 *
 * Position is measured in tick indices: 0 → (lastTick). Speed is in
 * tick-indices per second, so the whole cascade plays in (last / speed) seconds.
 */
export interface Playback {
  /** Live position, read every animation frame by the canvas. */
  pRef: React.RefObject<number>;
  /** Throttled position for chrome. */
  p: number;
  playing: boolean;
  speed: number;
  last: number;
  setP: (p: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (s: number) => void;
  restart: () => void;
}

export function usePlayback(last: number, initialSpeed = 0.62): Playback {
  const pRef = useRef(0);
  const [p, setPState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(initialSpeed);

  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const lastRef = useRef(last);
  playingRef.current = playing;
  speedRef.current = speed;
  lastRef.current = last;

  const rafRef = useRef<number | null>(null);
  const tsRef = useRef<number | null>(null);
  const uiSyncRef = useRef(0);

  const commit = useCallback((value: number) => {
    pRef.current = value;
    // Throttle React updates to ~25fps; the canvas already has the ref.
    const now = performance.now();
    if (now - uiSyncRef.current > 40) {
      uiSyncRef.current = now;
      setPState(value);
    }
  }, []);

  const setP = useCallback(
    (value: number) => {
      const v = Math.max(0, Math.min(lastRef.current, value));
      pRef.current = v;
      setPState(v);
    },
    [],
  );

  useEffect(() => {
    const tick = (ts: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (tsRef.current == null) tsRef.current = ts;
      const dt = Math.min(0.05, (ts - tsRef.current) / 1000);
      tsRef.current = ts;

      if (!playingRef.current) return;
      let next = pRef.current + speedRef.current * dt;
      if (next >= lastRef.current) {
        next = lastRef.current;
        playingRef.current = false;
        setPlaying(false);
      }
      commit(next);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      tsRef.current = null;
    };
  }, [commit]);

  const play = useCallback(() => {
    // Restart from the top if we're parked at the end.
    if (pRef.current >= lastRef.current - 1e-3) setP(0);
    setPlaying(true);
  }, [setP]);

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(
    () => (playingRef.current ? pause() : play()),
    [play, pause],
  );
  const setSpeed = useCallback((s: number) => setSpeedState(s), []);
  const restart = useCallback(() => {
    setP(0);
    setPlaying(true);
  }, [setP]);

  return {
    pRef,
    p,
    playing,
    speed,
    last,
    setP,
    play,
    pause,
    toggle,
    setSpeed,
    restart,
  };
}
