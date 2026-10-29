"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { LogoMark } from "@/components/brand/Logo";
import { useLang } from "@/components/i18n/LanguageProvider";

export default function AuthCallbackPage() {
  const { user, ready } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (user) {
      router.replace("/dashboard");
      return;
    }
    // No session arrived: the provider rejected the redirect or the code was
    // already consumed. Give it a moment, then explain instead of spinning.
    const timer = window.setTimeout(() => setFailed(true), 900);
    return () => window.clearTimeout(timer);
  }, [ready, user, router]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-5 py-16">
      <div className="card ring-grad animate-rise w-full max-w-[440px] p-8 text-center">
        <LogoMark size={56} />
        {failed ? (
          <>
            <span className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber/15 text-amber">
              <AlertTriangle size={22} />
            </span>
            <h1 className="text-page mt-4 !text-[22px]">{t("auth.error")}</h1>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-mute">{t("auth.demoNote")}</p>
            <Link href="/dashboard" className="btn btn-primary mt-5">
              {t("err.goHome")}
            </Link>
          </>
        ) : (
          <>
            <Loader2 size={26} className="mx-auto mt-6 animate-spin text-emerald" />
            <h1 className="text-page mt-4 !text-[22px]">{t("auth.callbackTitle")}</h1>
            <p className="mt-2 text-[12.5px] text-ink-mute">{t("auth.callbackText")}</p>
          </>
        )}
      </div>
    </main>
  );
}
