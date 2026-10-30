"use client";

/**
 * Whether the desktop rail is showing. A module-level store keeps the switch in
 * sync between the rail, the header button and the content padding, and the
 * choice survives reloads.
 */

import { useSyncExternalStore } from "react";

import { useHydrated } from "@/lib/use-hydrated";

const KEY = "stay-focused.rail";
const EVENT = "stay-focused:rail";

export type RailState = "open" | "closed";

let cached: RailState | null = null;

function read(): RailState {
  try {
    return window.localStorage.getItem(KEY) === "closed" ? "closed" : "open";
  } catch {
    return "open";
  }
}

function getSnapshot(): RailState {
  if (cached === null) cached = read();
  return cached;
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cached = read();
    callback();
  };
  const onLocal = () => {
    cached = read();
    callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onLocal);
  };
}

export function setRail(next: RailState): void {
  cached = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    /* private mode — the session still remembers it in memory */
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * `open` is always true until the client has hydrated, so the server HTML and
 * the first client render agree and the rail never flashes on load.
 */
export function useRail(): { open: boolean; toggle: () => void } {
  const state = useSyncExternalStore<RailState>(subscribe, getSnapshot, () => "open");
  const hydrated = useHydrated();
  return {
    open: hydrated ? state === "open" : true,
    toggle: () => setRail(getSnapshot() === "open" ? "closed" : "open"),
  };
}
