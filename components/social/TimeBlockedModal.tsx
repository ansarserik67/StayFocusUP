"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, Hourglass, ScanFace } from "lucide-react";

import { useLang } from "@/components/i18n/LanguageProvider";
import { Modal } from "@/components/ui/Modal";

export function TimeBlockedModal({
  open,
  onClose,
  appName,
}: {
  open: boolean;
  onClose: () => void;
  /** Set when only this app's own daily quota is used up. */
  appName?: string | null;
}) {
  const { t } = useLang();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      onClose();
      router.push("/dashboard");
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [open, onClose, router]);

  return (
    <Modal open={open} onClose={onClose} size="sm" labelledBy="blocked-title" className="text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber/15 text-amber">
        <Hourglass size={26} />
      </span>
      <h2 id="blocked-title" className="font-display mt-4 text-[22px] font-extrabold">
        {appName
          ? t("social.appBlockedTitle", { app: appName })
          : t("social.blockedTitle")}
      </h2>
      <p className="mx-auto mt-2 max-w-[38ch] text-[13.5px] leading-relaxed text-ink-soft">
        {appName
          ? t("social.appBlockedText")
          : "Время на соцсети закончилось. Возвращаем тебя в StayFocus..."}
      </p>
      <button
        type="button"
        onClick={() => {
          onClose();
          router.push("/dashboard");
        }}
        className="btn btn-primary mt-6 w-full"
      >
        <Home size={17} />
        Вернуться в StayFocus
      </button>
      <button
        type="button"
        onClick={() => {
          onClose();
          router.push("/workout");
        }}
        className="btn btn-ghost mt-1.5 w-full text-[13px]"
      >
        <ScanFace size={17} />
        {t("social.earnCta")}
      </button>
      <button type="button" onClick={onClose} className="btn btn-ghost mt-1.5 w-full text-[13px]">
        {t("social.later")}
      </button>
    </Modal>
  );
}
