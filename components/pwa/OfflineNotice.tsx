"use client";

import Link from "next/link";
import { ArrowLeft, WifiOff } from "lucide-react";

import { useLang } from "@/components/i18n/LanguageProvider";
import { LogoMark } from "@/components/brand/Logo";

export function OfflineNotice() {
  const { t } = useLang();
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-5 py-16">
      <div className="card ring-grad animate-rise w-full max-w-[480px] p-8 text-center">
        <LogoMark size={56} />
        <span className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber/15 text-amber">
          <WifiOff size={22} />
        </span>
        <h1 className="text-page mt-4 !text-[24px]">{t("offline.title")}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{t("offline.text")}</p>
        <Link href="/dashboard" className="btn btn-primary mt-6">
          <ArrowLeft size={16} />
          {t("offline.back")}
        </Link>
      </div>
    </main>
  );
}
