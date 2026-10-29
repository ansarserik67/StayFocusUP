"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";

import { useHydrated } from "@/lib/use-hydrated";

/**
 * Fixed overlays must escape the page-transition wrapper: an ancestor with an
 * animation/transform becomes a containing block, which would otherwise paint
 * the overlay behind the sticky header and bottom navigation.
 */
export function Portal({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return createPortal(children, document.body);
}
