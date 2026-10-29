"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { appRemainingSeconds } from "@/lib/state";
import type { SocialApp } from "@/lib/social";

export function useSocialLaunch() {
  const { remaining, now, state, startSession, cancelSession } = useFocus();
  const { t } = useLang();
  const { push } = useToast();
  const [blockedApp, setBlockedApp] = useState<SocialApp | null>(null);
  const [blockedGlobal, setBlockedGlobal] = useState(false);
  const guardRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (guardRef.current !== null) window.clearTimeout(guardRef.current);
    },
    [],
  );

  const launch = useCallback(
    (app: SocialApp) => {
      const appLeft = appRemainingSeconds(state, app.id, now);
      if (appLeft <= 0) {
        // Only this app's own quota is gone: keep the explanation specific so
        // the shared daily budget does not look spent.
        setBlockedApp(app);
        return;
      }
      if (remaining <= 0) {
        setBlockedGlobal(true);
        return;
      }
      // Must stay inside the click handler so popup blockers allow it.
      const opened = window.open(app.url, "_blank");
      if (!opened) {
        push(t("social.popupBlocked"), "error");
        return;
      }
      try {
        opened.opener = null;
      } catch {
        /* cross-origin window — nothing else to do */
      }
      startSession(app.id);
      // Two seconds later the external page must genuinely exist: a blocked
      // popup or one the user closed right away is not time spent socializing.
      // An opened window next to this one keeps the session (and the top bar)
      // running even though this tab never became hidden.
      if (guardRef.current !== null) window.clearTimeout(guardRef.current);
      guardRef.current = window.setTimeout(() => {
        let gone = true;
        try {
          gone = opened.closed;
        } catch {
          gone = false; // cross-origin handle we may not inspect: assume alive
        }
        if (gone && document.visibilityState === "visible") cancelSession();
      }, 2000);
    },
    [remaining, now, state, startSession, cancelSession, push, t],
  );

  return {
    launch,
    blocked: blockedGlobal || blockedApp !== null,
    blockedAppName: blockedApp?.name ?? null,
    closeBlocked: () => {
      setBlockedGlobal(false);
      setBlockedApp(null);
    },
  };
}
