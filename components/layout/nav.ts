import {
  CalendarDays,
  LayoutDashboard,
  PawPrint,
  ScanFace,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import type { TranslationKey } from "@/lib/i18n";

export interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/social", labelKey: "nav.social", icon: Smartphone },
  { href: "/workout", labelKey: "nav.workout", icon: ScanFace },
  { href: "/pet", labelKey: "nav.pet", icon: PawPrint },
  { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
];
