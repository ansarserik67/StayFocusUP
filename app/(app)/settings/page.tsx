"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  Cloud,
  Download,
  Eye,
  HardDrive,
  Info,
  Languages,
  LogOut,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  Volume2,
} from "lucide-react";

import { AudioControls } from "@/components/audio/AudioControls";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/layout/Avatar";
import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { usePwa } from "@/components/pwa/PwaProvider";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/ToastProvider";
import { LANGS, dailyQuote } from "@/lib/i18n";
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
  showSystemNotification,
} from "@/lib/notifications";
import { dayKey } from "@/lib/state";

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Bell;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <header className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-surface-2 text-emerald">
          <Icon size={17} />
        </span>
        <div>
          <h2 className="text-[14.5px] font-bold">{title}</h2>
          {description && (
            <p className="mt-1 max-w-[58ch] text-[11.5px] leading-relaxed text-ink-mute">
              {description}
            </p>
          )}
        </div>
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { t, lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const { user, configured, signOut } = useAuth();
  const { state, updateSettings, resetData, remoteStatus, today } = useFocus();
  const { installed, canInstall, install } = usePwa();
  const { push } = useToast();

  // Settings render inside the authenticated shell, i.e. only on the client.
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    () => notificationPermission(),
  );
  const [confirmReset, setConfirmReset] = useState(false);

  const enableNotifications = async () => {
    if (!notificationsSupported()) {
      push(t("notify.unsupported"), "error");
      return;
    }
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      updateSettings({ notifications: true });
      push(t("notify.enabled"), "success");
      void showSystemNotification(
        t("notify.quoteTitle"),
        dailyQuote(lang, dayKey(), state.streak),
        "stay-focused-welcome",
      );
    } else if (result === "denied") {
      updateSettings({ notifications: false });
      push(t("notify.permissionBlocked"), "error");
    }
  };

  const test = async () => {
    const ok = await showSystemNotification(
      t("notify.breakTitle"),
      t("notify.testBody"),
      "stay-focused-test",
    );
    push(ok ? t("notify.testBody") : t("notify.permissionBlocked"), ok ? "info" : "error");
  };

  const granted = permission === "granted";

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-emerald">
          {t("settings.title")}
        </p>
        <h1 className="text-page mt-1.5">{t("settings.subtitle")}</h1>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section icon={Languages} title={t("settings.appearance")} description={t("settings.language")}>
          <div className="space-y-4">
            <div>
              <span className="field-label">{t("settings.language")}</span>
              <div className="grid grid-cols-3 gap-2">
                {LANGS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLang(item.id)}
                    aria-pressed={lang === item.id}
                    className={`rounded-xl border px-2 py-2.5 text-[12px] font-semibold transition ${
                      lang === item.id
                        ? "border-emerald/45 bg-emerald/10 text-ink"
                        : "border-line text-ink-soft hover:border-line-strong"
                    }`}
                  >
                    <span className="block text-[15px]">{item.short}</span>
                    <span className="mt-0.5 block text-[10px] font-normal text-ink-mute">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="field-label">{t("settings.theme")}</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  aria-pressed={theme === "dark"}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                    theme === "dark" ? "border-emerald/45 bg-emerald/10" : "border-line hover:border-line-strong"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F172A] text-cyan">
                    <Moon size={15} />
                  </span>
                  <span>
                    <span className="block text-[12px] font-semibold">{t("settings.dark")}</span>
                    <span className="block text-[10px] text-ink-mute">#0F172A + #10B981</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  aria-pressed={theme === "light"}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                    theme === "light" ? "border-emerald/45 bg-emerald/10" : "border-line hover:border-line-strong"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#D97706] ring-1 ring-line">
                    <Sun size={15} />
                  </span>
                  <span>
                    <span className="block text-[12px] font-semibold">{t("settings.light")}</span>
                    <span className="block text-[10px] text-ink-mute">#F8FAFC + indigo</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </Section>

        <Section
          icon={permission === "denied" ? BellOff : Bell}
          title={t("settings.notifications")}
          description={t("settings.notificationsDesc")}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/40 p-3">
              <span className={`inline-flex items-center gap-2 text-[12px] font-medium ${granted ? "text-emerald" : "text-ink-soft"}`}>
                {granted ? <Check size={14} /> : <Bell size={14} />}
                {permission === "unsupported"
                  ? t("notify.unsupported")
                  : granted
                    ? t("settings.notificationsOn")
                    : permission === "denied"
                      ? t("settings.notificationsBlocked")
                      : t("settings.enableNotifications")}
              </span>
              {!granted && permission !== "denied" && permission !== "unsupported" && (
                <button type="button" onClick={() => void enableNotifications()} className="btn btn-primary !min-h-[34px] !px-3 text-[11.5px]">
                  {t("settings.enableNotifications")}
                </button>
              )}
              {granted && (
                <button type="button" onClick={() => void test()} className="btn btn-secondary !min-h-[34px] !px-3 text-[11.5px]">
                  {t("settings.testNotification")}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
              <div>
                <p className="text-[12.5px] font-medium">{t("settings.quoteOn")}</p>
                <p className="mt-0.5 text-[10.5px] text-ink-mute">{t("settings.quoteOnDesc")}</p>
              </div>
              <Toggle
                checked={state.settings.notifications && state.settings.quoteNotifications}
                onChange={(value) => {
                  if (value && !granted) {
                    void enableNotifications();
                    return;
                  }
                  updateSettings({ notifications: value, quoteNotifications: value });
                }}
                label={t("settings.quoteOn")}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
              <div>
                <p className="text-[12.5px] font-medium">{t("settings.breakOn")}</p>
                <p className="mt-0.5 text-[10.5px] text-ink-mute">{t("settings.breakOnDesc")}</p>
              </div>
              <Toggle
                checked={state.settings.breakReminders}
                onChange={(value) => updateSettings({ breakReminders: value })}
                label={t("settings.breakOn")}
              />
            </div>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("stay-focused:break"))}
              className="text-[11.5px] font-semibold text-cyan hover:underline"
            >
              {t("settings.breakTest")} →
            </button>
          </div>
        </Section>

        <Section icon={Eye} title={t("settings.detox")} description={t("settings.detoxDesc")}>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
            <div>
              <p className="text-[12.5px] font-medium">{t("settings.detox")}</p>
              <p className="mt-0.5 text-[10.5px] text-ink-mute">{t("social.detoxBadge")}</p>
            </div>
            <Toggle
              checked={state.settings.grayscale}
              onChange={(value) => updateSettings({ grayscale: value })}
              label={t("settings.detox")}
            />
          </div>
        </Section>

        <Section icon={Volume2} title={t("settings.audio")} description={t("settings.audioDesc")}>
          <AudioControls />
        </Section>

        <Section icon={Cloud} title={t("settings.account")}>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3">
            <Avatar name={user?.name ?? "Focus Friend"} picture={user?.picture} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold">{user?.name}</p>
              <p className="truncate text-[11px] text-ink-mute">{user?.email}</p>
            </div>
            <button type="button" onClick={() => void signOut()} className="btn btn-secondary !min-h-[34px] !px-3 text-[11.5px]">
              <LogOut size={13} />
              {t("header.signOut")}
            </button>
          </div>

          <div className="mt-3 space-y-2 text-[11px]">
            <div className="flex items-center justify-between gap-2 rounded-lg px-1">
              <span className="inline-flex items-center gap-1.5 text-ink-mute">
                {configured ? <Cloud size={13} /> : <HardDrive size={13} />}
                {t("settings.dataMode")}
              </span>
              <span className="font-medium text-ink-soft">
                {configured ? t("settings.connected") : t("settings.local")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg px-1">
              <span className="text-ink-mute">{t("settings.storage")}</span>
              <span className="font-medium text-ink-soft">
                {configured
                  ? remoteStatus === "synced"
                    ? t("settings.cloud")
                    : remoteStatus === "error"
                      ? t("toast.genericError")
                      : t("common.loading")
                  : t("common.localOnly")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg px-1">
              <span className="text-ink-mute">{t("settings.version")}</span>
              <span className="font-mono text-ink-soft">1.0.0</span>
            </div>
          </div>
        </Section>

        <Section icon={Download} title={t("settings.install")} description={t("settings.installDesc")}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
            <div>
              <p className="text-[12.5px] font-medium">
                {installed ? t("settings.installed") : t("install.title")}
              </p>
              <p className="mt-0.5 text-[10.5px] text-ink-mute">{t("install.ios")}</p>
            </div>
            {installed ? (
              <span className="chip !border-emerald/30 !bg-emerald/10 !text-emerald">
                <Check size={12} /> {t("settings.installed")}
              </span>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const outcome = await install();
                  if (outcome === "unavailable") push(t("toast.installUnavailable"), "info");
                }}
                disabled={!canInstall}
                className="btn btn-primary !min-h-[36px] !px-3 text-[11.5px]"
              >
                <Download size={13} />
                {t("settings.installCta")}
              </button>
            )}
          </div>
        </Section>

        <Section icon={ShieldCheck} title={t("settings.about")} description={t("settings.aboutText")}>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-mute">
            <span className="chip">
              <ShieldCheck size={12} className="text-emerald" /> {t("landing.privacy")}
            </span>
            <span className="chip">
              <Info size={12} /> {t("settings.version")} 1.0.0
            </span>
          </div>
        </Section>

        <Section icon={RotateCcw} title={t("settings.reset")} description={t("settings.resetDesc")}>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="btn btn-danger !min-h-[38px] text-[12px]"
          >
            <RotateCcw size={14} />
            {t("settings.reset")}
          </button>
        </Section>
      </div>

      <p className="pb-2 text-center text-[10.5px] text-ink-mute">
        {t("app.tagline")} · {today}
      </p>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        size="sm"
        labelledBy="reset-title"
      >
        <h2 id="reset-title" className="text-card">
          {t("settings.reset")}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{t("settings.resetConfirm")}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              resetData();
              setConfirmReset(false);
            }}
            className="btn btn-danger flex-1"
          >
            {t("common.delete")}
          </button>
          <button type="button" onClick={() => setConfirmReset(false)} className="btn btn-secondary flex-1">
            {t("common.cancel")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
