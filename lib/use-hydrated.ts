"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and the hydration render, true right after the client has
 * hydrated. Using an external store avoids the cascading render that a
 * `mounted` state flag inside useEffect would cause.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
