"use client";

import { Lock, ScanFace, Timer, Zap } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { SignInCard } from "@/components/auth/SignInCard";
import { useLang } from "@/components/i18n/LanguageProvider";
import { LanguageMenu } from "@/components/layout/LanguageMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ProgressRing } from "@/components/ui/ProgressRing";

const FEATURES = [
  { icon: Lock, key: "landing.f1" as const },
  { icon: ScanFace, key: "landing.f2" as const },
  { icon: Zap, key: "landing.f3" as const },
];

export function AuthGate() {
  const { t } = useLang();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="container-app flex h-[72px] items-center justify-between">
        <Logo href="/" />
        <div className="flex items-center gap-2">
          <LanguageMenu />
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="container-app grid flex-1 items-center gap-8 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-12">
        {/* card first on mobile */}
        <section className="order-1 w-full lg:order-2">
          <div className="card ring-grad relative mx-auto w-full max-w-[470px] overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-emerald/15 blur-3xl" />
            <span className="eyebrow text-emerald">{t("landing.badge")}</span>
            <h1 className="text-page mt-2.5 !text-[27px] sm:!text-[30px]">
              {t("auth.gateTitle")}
            </h1>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
              {t("auth.gateText")}
            </p>
            <div className="mt-6">
              <SignInCard />
            </div>
          </div>
        </section>

        <section className="order-2 lg:order-1">
          <span className="chip !border-emerald/30 !bg-emerald/10 !text-emerald">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
            {t("landing.privacy")}
          </span>
          <h2 className="text-hero mt-5 !text-[38px] sm:!text-[50px] lg:!text-[54px]">
            {t("landing.title").split(" ").slice(0, -3).join(" ")}{" "}
            <span className="text-grad">{t("landing.title").split(" ").slice(-3).join(" ")}</span>
          </h2>
          <p className="mt-4 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-soft">
            {t("landing.subtitle")}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-5">
            <div className="relative">
              <ProgressRing progress={0.62} size={124} stroke={9} label="62%">
                <span className="mono font-display text-[19px] font-extrabold">37:12</span>
                <span className="text-[9.5px] uppercase tracking-[0.14em] text-ink-mute">
                  {t("social.remaining")}
                </span>
              </ProgressRing>
            </div>
            <div className="grid flex-1 gap-2.5 sm:grid-cols-3">
              {FEATURES.map(({ icon: Icon, key }) => (
                <div key={key} className="rounded-2xl border border-line bg-surface/60 p-3">
                  <Icon size={17} className="text-emerald" />
                  <p className="mt-2 text-[12px] font-semibold leading-tight text-ink">
                    {t(`${key}.title` as "landing.f1.title")}
                  </p>
                  <p className="mt-1 text-[10.5px] leading-snug text-ink-mute">
                    {t(`${key}.text` as "landing.f1.text")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-5">
            {[
              { value: "60", label: t("landing.stats.budget") },
              { value: "30", label: t("landing.stats.reward") },
              { value: "3", label: t("landing.stats.langs") },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-[24px] font-extrabold leading-none text-ink">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] text-ink-mute">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="container-app flex items-center gap-2 pb-6 pt-2 text-[11px] text-ink-mute">
        <Timer size={12} />
        {t("app.tagline")}
      </footer>
    </div>
  );
}
