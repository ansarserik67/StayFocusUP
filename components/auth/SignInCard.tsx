"use client";

import { ArrowRight, ShieldCheck, Zap } from "lucide-react";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/components/auth/AuthProvider";
import { useLang } from "@/components/i18n/LanguageProvider";

export function SignInCard({ compact = false }: { compact?: boolean }) {
  const { configured, signInLocal } = useAuth();
  const { t } = useLang();

  return (
    <div className={compact ? "" : "p-1"}>
      <div className="flex flex-col gap-2.5">
        {configured ? (
          <>
            <GoogleSignInButton />
            <button
              type="button"
              onClick={signInLocal}
              className="btn btn-ghost w-full !min-h-[38px] text-[12.5px]"
            >
              {t("auth.demoCta")}
              <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={signInLocal}
              className="btn btn-primary w-full"
            >
              <Zap size={17} />
              {t("auth.demoCta")}
            </button>
            <GoogleSignInButton />
          </>
        )}
      </div>

      {!configured && (
        <p className="mt-4 rounded-xl border border-line bg-surface-2/50 p-3 text-[11.5px] leading-relaxed text-ink-mute">
          <span className="font-semibold text-ink-soft">{t("auth.demoTitle")}. </span>
          {t("auth.demoNote")}
        </p>
      )}

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-ink-mute">
        <ShieldCheck size={13} className="mt-0.5 flex-none text-emerald" />
        {t("auth.terms")}
      </p>
    </div>
  );
}
