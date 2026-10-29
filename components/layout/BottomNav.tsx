"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { NAV_ITEMS } from "@/components/layout/nav";
import { formatDuration } from "@/lib/i18n";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();
  const { remaining, sessionActive } = useFocus();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line/80 bg-surface/85 px-2 pb-[max(4px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-2xl lg:hidden"
      aria-label={t("nav.primary")}
    >
      {sessionActive && (
        <div className="mx-auto mb-1 flex w-fit items-center gap-1.5 rounded-full bg-emerald/12 px-2.5 py-0.5 text-[10px] font-semibold text-emerald">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
          <span className="mono">{formatDuration(remaining)}</span>
        </div>
      )}
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active}
              aria-current={active ? "page" : undefined}
              className="bottom-nav-item"
            >
              <Icon size={19} strokeWidth={active ? 2.4 : 1.9} />
              <span className="line-clamp-1">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
