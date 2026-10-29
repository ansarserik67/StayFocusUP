"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  Flame,
  Heart,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  Wind,
  Zap,
} from "lucide-react";

import { SignInCard } from "@/components/auth/SignInCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { Logo } from "@/components/brand/Logo";
import { useLang } from "@/components/i18n/LanguageProvider";
import { LanguageMenu } from "@/components/layout/LanguageMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AppCard } from "@/components/social/AppCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SOCIAL_APPS } from "@/lib/social";

const FEATURES = [
  { icon: Timer, title: "landing.f1.title" as const, text: "landing.f1.text" as const },
  { icon: ScanFace, title: "landing.f2.title" as const, text: "landing.f2.text" as const },
  { icon: Zap, title: "landing.f3.title" as const, text: "landing.f3.text" as const },
  { icon: Wind, title: "landing.f4.title" as const, text: "landing.f4.text" as const },
];

const STEPS = [
  { icon: Smartphone, titleKey: "nav.social" as const, textKey: "social.note" as const },
  { icon: Camera, titleKey: "workout.title" as const, textKey: "workout.chooseHint" as const },
  { icon: Flame, titleKey: "pet.streak" as const, textKey: "workout.streakNote" as const },
];

export default function LandingPage() {
  const { t } = useLang();
  const { user } = useAuth();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="container-app flex h-[72px] items-center justify-between">
        <Logo href="/" />
        <div className="flex items-center gap-2">
          <LanguageMenu />
          <ThemeToggle />
          <Link href="/dashboard" className="btn btn-primary !min-h-[38px] !px-4 text-[12.5px]">
            {user ? t("landing.cta") : t("auth.gateCta")}
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* hero */}
        <section className="container-app relative grid items-center gap-9 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="animate-rise">
            <span className="chip !border-emerald/30 !bg-emerald/10 !text-emerald">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
              {t("landing.badge")}
            </span>
            <h1 className="text-hero mt-5">
              {t("landing.title").split(" ").slice(0, -3).join(" ")}{" "}
              <span className="text-grad">{t("landing.title").split(" ").slice(-3).join(" ")}</span>
            </h1>
            <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-ink-soft">
              {t("landing.subtitle")}
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href="/dashboard" className="btn btn-primary">
                {t("landing.cta")}
                <ArrowRight size={16} />
              </Link>
              <a href="#how" className="btn btn-secondary">
                {t("landing.secondary")}
              </a>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3">
              {[
                { value: "60", key: "landing.stats.budget" as const },
                { value: "30", key: "landing.stats.reward" as const },
                { value: "3", key: "landing.stats.langs" as const },
              ].map((stat) => (
                <div key={stat.key}>
                  <p className="font-display text-[25px] font-extrabold leading-none text-ink">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-mute">{t(stat.key)}</p>
                </div>
              ))}
            </div>

            <p className="mt-7 flex items-center gap-2 text-[11.5px] text-ink-mute">
              <ShieldCheck size={14} className="text-emerald" />
              {t("landing.privacy")}
            </p>
          </div>

          {/* product visual */}
          <div className="animate-rise relative mx-auto w-full max-w-[460px]">
            <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-gradient-to-br from-emerald/15 via-cyan/10 to-indigo/15 blur-2xl" />
            <div className="card ring-grad relative overflow-hidden p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-emerald">{t("dash.budgetTitle")}</p>
                  <p className="mono font-display mt-1 text-[34px] font-extrabold leading-none">37:12</p>
                  <p className="mt-1 text-[10.5px] text-ink-mute">{t("dash.timeLeft")}</p>
                </div>
                <ProgressRing progress={0.62} size={84} stroke={7} label="62%">
                  <span className="font-display text-[13px] font-extrabold">62%</span>
                </ProgressRing>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="chip !border-emerald/30 !bg-emerald/10 !text-emerald !text-[10px]">
                  <Zap size={10} /> +30 {t("common.minutes")}
                </span>
                <span className="chip !text-[10px]">
                  <Flame size={10} className="text-amber" /> {t("dash.streakDays", { count: 7 })}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {SOCIAL_APPS.slice(0, 3).map((app, index) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    compact
                    locked={index === 2}
                    remaining={2232}
                    onOpen={() => undefined}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-surface-2/50 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald/12 text-emerald">
                    <ScanFace size={14} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold">{t("workout.ex.pushup")}</p>
                    <p className="text-[9.5px] text-ink-mute">12 / 15 {t("workout.reps")}</p>
                  </div>
                </div>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                  <div className="progress-shine h-full w-4/5 rounded-full" />
                </div>
              </div>
            </div>

            <div className="animate-float absolute -bottom-5 -left-4 hidden items-center gap-2 rounded-2xl border border-line bg-surface/95 px-3 py-2 shadow-lift backdrop-blur sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald/15 text-emerald">
                <Check size={14} />
              </span>
              <span className="text-[10.5px] font-semibold">+30 min earned</span>
            </div>
          </div>
        </section>

        {/* features */}
        <section className="container-app py-8 lg:py-12">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card card-hover p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald/12 text-emerald">
                  <Icon size={19} />
                </span>
                <h3 className="text-card mt-3 !text-[15px]">{t(title)}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{t(text)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="container-app scroll-mt-20 py-10 lg:py-16">
          <div className="mb-7 max-w-[620px]">
            <span className="eyebrow text-emerald">{t("landing.secondary")}</span>
            <h2 className="text-page mt-2">{t("auth.gateTitle")}</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{t("auth.subtitle")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, titleKey, textKey }, index) => (
              <div key={titleKey} className="card relative overflow-hidden p-5">
                <span className="font-display absolute right-4 top-3 text-[44px] font-extrabold leading-none text-line/70">
                  0{index + 1}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/12 text-cyan">
                  <Icon size={19} />
                </span>
                <h3 className="text-card mt-3 !text-[15px]">{t(titleKey)}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{t(textKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA + sign in */}
        <section className="container-app pb-14 pt-4 lg:pb-20">
          <div className="card ring-grad relative overflow-hidden p-6 sm:p-9">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald/15 blur-3xl" />
            <div className="relative grid items-center gap-7 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <span className="chip !border-emerald/30 !bg-emerald/10 !text-emerald">
                  <Sparkles size={12} /> {t("landing.badge")}
                </span>
                <h2 className="text-page mt-3">{t("auth.title")}</h2>
                <p className="mt-2 max-w-[48ch] text-[13.5px] leading-relaxed text-ink-soft">
                  {t("auth.subtitle")}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-ink-mute">
                  <span className="chip">
                    <Heart size={11} className="text-rose" /> {t("pet.mood.happy")}
                  </span>
                  <span className="chip">
                    <CalendarDays size={11} className="text-indigo" /> {t("nav.calendar")}
                  </span>
                  <span className="chip">
                    <ShieldCheck size={11} className="text-emerald" /> {t("common.localOnly")}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-surface/60 p-4">
                <SignInCard compact />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/70">
        <div className="container-app flex flex-wrap items-center justify-between gap-3 py-5 text-[11px] text-ink-mute">
          <span className="flex items-center gap-2">
            <ShieldCheck size={13} className="text-emerald" />
            StayFocus · {t("app.tagline")}
          </span>
          <span className="flex items-center gap-3">
            <Link href="/offline" className="transition hover:text-ink">
              PWA
            </Link>
            <Link href="/dashboard" className="transition hover:text-ink">
              {t("landing.cta")}
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
