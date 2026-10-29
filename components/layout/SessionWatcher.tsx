"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Hourglass, ScanFace } from "lucide-react";

import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { Modal } from "@/components/ui/Modal";

export function SessionWatcher() {
  const { timeUp, dismissTimeUp, state } = useFocus();
  const { t } = useLang();
  const router = useRouter();
  const pathname = usePathname();

  // Dopamine Detox is a standing choice, not a session side effect: the
  // moment the toggle is on the whole app — logo, header and all — is grey,
  // so nothing in here is colourful enough to be worth staring at.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("detox", state.settings.grayscale);
    return () => root.classList.remove("detox");
  }, [state.settings.grayscale]);

  useEffect(() => {
    if (!timeUp) return;
    if (pathname !== "/workout") router.push("/workout");
  }, [timeUp, pathname, router]);

  return (
    <Modal
      open={timeUp}
      onClose={dismissTimeUp}
      labelledBy="time-up-title"
      size="sm"
      className="text-center"
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber/15 text-amber">
        <Hourglass size={26} />
      </span>
      <h2 id="time-up-title" className="font-display mt-4 text-[22px] font-extrabold">
        {t("dash.timeUpTitle")}
      </h2>
      <p className="mx-auto mt-2 max-w-[38ch] text-[13.5px] leading-relaxed text-ink-soft">
        {t("dash.timeUpText")}
      </p>
      <button
        type="button"
        onClick={() => {
          dismissTimeUp();
          router.push("/workout");
        }}
        className="btn btn-primary mt-6 w-full"
      >
        <ScanFace size={17} />
        {t("dash.timeUpCta")}
      </button>
      <button
        type="button"
        onClick={dismissTimeUp}
        className="btn btn-ghost mt-1.5 w-full text-[13px]"
      >
        {t("dash.timeUpLater")}
      </button>
    </Modal>
  );
}
