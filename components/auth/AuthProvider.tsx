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
import type { User } from "@supabase/supabase-js";

import { useHydrated } from "@/lib/use-hydrated";
import {
  authCallbackUrl,
  getSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { AUTH_STORAGE_KEY } from "@/lib/types";

export type AuthMode = "google" | "local";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
  mode: AuthMode;
}

interface AuthValue {
  user: AppUser | null;
  ready: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInLocal: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);
const AUTH_EVENT = "stay-focused:auth";

const LOCAL_ACCOUNT = {
  name: "Focus Friend",
  email: "focus.friend@local",
};

function displayNameOf(user: User): string {
  const metadata = user.user_metadata ?? {};
  return (
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    user.email?.split("@")[0] ||
    "Focus Friend"
  );
}

function fromSupabaseUser(user: User): AppUser {
  const metadata = user.user_metadata ?? {};
  const picture =
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata.picture === "string" && metadata.picture) ||
    undefined;
  return {
    id: user.id,
    name: displayNameOf(user),
    email: user.email ?? "",
    picture,
    mode: "google",
  };
}

function isAppUser(value: unknown): value is AppUser {
  if (!value || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  return (
    typeof raw.id === "string" &&
    typeof raw.name === "string" &&
    typeof raw.email === "string" &&
    (raw.mode === "google" || raw.mode === "local")
  );
}

function getLocalRaw(): string | null {
  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribeLocal(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(AUTH_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(AUTH_EVENT, callback);
  };
}

function readLocalUser(raw: string | null): AppUser | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAppUser(parsed) && parsed.mode === "local" ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalUser(user: AppUser | null) {
  try {
    if (user) window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const localRaw = useSyncExternalStore(subscribeLocal, getLocalRaw, () => null);
  const localUser = useMemo(() => readLocalUser(localRaw), [localRaw]);

  const [remoteUser, setRemoteUser] = useState<AppUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data.session?.user) setRemoteUser(fromSupabaseUser(data.session.user));
        setSessionChecked(true);
      })
      .catch(() => {
        if (!cancelled) setSessionChecked(true);
      });

    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      setRemoteUser(session?.user ? fromSupabaseUser(session.user) : null);
      setSessionChecked(true);
    });
    const unsubscribe = () => subscription.data.subscription.unsubscribe();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      const local: AppUser = { id: "local-user", mode: "local", ...LOCAL_ACCOUNT };
      writeLocalUser(local);
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackUrl(),
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
  }, []);

  const signInLocal = useCallback(() => {
    writeLocalUser({ id: "local-user", mode: "local", ...LOCAL_ACCOUNT });
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* clear locally regardless */
      }
    }
    setRemoteUser(null);
    writeLocalUser(null);
  }, []);

  const user = remoteUser ?? localUser;
  const ready = hydrated && (!isSupabaseConfigured || sessionChecked);

  const value = useMemo(
    () => ({
      user,
      ready,
      configured: isSupabaseConfigured,
      signInWithGoogle,
      signInLocal,
      signOut,
    }),
    [user, ready, signInWithGoogle, signInLocal, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
