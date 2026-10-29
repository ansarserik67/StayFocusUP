"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useLang } from "@/components/i18n/LanguageProvider";

/** The official four-colour Google mark, drawn inline so no asset is fetched. */
export function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.6l6.2 5.2C41 35.5 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5Z"
      />
    </svg>
  );
}

/**
 * Sign in with Google through Supabase (`signInWithOAuth`), falling back to a
 * clearly disabled button when the public Supabase variables are absent — the
 * app never pretends an OAuth round-trip happened.
 *
 * The Google client id/secret are configured on the Supabase project
 * (Authentication → Providers → Google); the browser only ever sends the user
 * to Supabase's `/authorize` endpoint, so no Google credential is embedded in
 * this component.
 */
export function GoogleSignInButton() {
  const { configured, signInWithGoogle } = useAuth();
  const { t } = useLang();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    setError("");
    setPending(true);
    try {
      await signInWithGoogle();
    } catch {
      setError(t("auth.error"));
      setPending(false);
    }
  };

  if (!configured) {
    return (
      <button
        type="button"
        disabled
        title={t("auth.demoNote")}
        className="btn btn-secondary w-full cursor-not-allowed opacity-55"
      >
        <GoogleGlyph />
        {t("auth.google")}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handle()}
        disabled={pending}
        className="btn btn-primary w-full !bg-none !bg-white !text-[#15213a] shadow-[0_16px_30px_-18px_rgba(0,0,0,0.45)] hover:!bg-[#f4f7fb]"
      >
        {pending ? <Loader2 size={17} className="animate-spin" /> : <GoogleGlyph />}
        {pending ? t("auth.connecting") : t("auth.google")}
      </button>

      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose/30 bg-rose/10 p-2.5 text-[12px] text-rose">
          <AlertTriangle size={14} className="mt-0.5 flex-none" />
          {error}
        </p>
      )}
    </>
  );
}
