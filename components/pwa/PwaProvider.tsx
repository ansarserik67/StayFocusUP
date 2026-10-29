"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaValue {
  canInstall: boolean;
  installed: boolean;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

const PwaContext = createContext<PwaValue>({
  canInstall: false,
  installed: false,
  install: async () => "unavailable",
});

const standaloneQuery = "(display-mode: standalone)";

function subscribeDisplayMode(callback: () => void) {
  const media = window.matchMedia(standaloneQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia(standaloneQuery).matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [appInstalled, setAppInstalled] = useState(false);
  const standalone = useSyncExternalStore(
    subscribeDisplayMode,
    getStandalone,
    () => false,
  );
  const installed = standalone || appInstalled;

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          /* progressive enhancement */
        });
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setAppInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return "unavailable" as const;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setAppInstalled(true);
      setPromptEvent(null);
    }
    return choice.outcome;
  }, [promptEvent]);

  const value = useMemo(
    () => ({ canInstall: promptEvent !== null, installed, install }),
    [promptEvent, installed, install],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaValue {
  return useContext(PwaContext);
}
