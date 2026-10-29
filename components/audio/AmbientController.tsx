"use client";

import { useEffect, useRef } from "react";

import { useFocus } from "@/components/focus/FocusProvider";
import { AmbientEngine } from "@/lib/ambient";
import type { AmbientTrack } from "@/lib/types";

/** Keeps a single audio engine alive for the whole app. Renders nothing. */
export function AmbientController() {
  const { state } = useFocus();
  const track = state.settings.track;
  const volume = state.settings.volume;
  const engineRef = useRef<AmbientEngine | null>(null);

  useEffect(() => {
    engineRef.current = new AmbientEngine();
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setVolume(volume);
    if (track === "off") {
      engine.stop();
      return;
    }
    engine.play(track as AmbientTrack).catch(() => {
      /* autoplay blocked until a gesture — retried below */
    });
  }, [track, volume]);

  useEffect(() => {
    if (track === "off") return;
    const retry = () => {
      engineRef.current?.play(track as AmbientTrack).catch(() => undefined);
    };
    window.addEventListener("pointerdown", retry, { once: true });
    return () => window.removeEventListener("pointerdown", retry);
  }, [track]);

  return null;
}
