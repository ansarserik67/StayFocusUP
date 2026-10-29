"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AmbientController } from "@/components/audio/AmbientController";
import { SessionBar } from "@/components/focus/SessionBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { SessionWatcher } from "@/components/layout/SessionWatcher";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ReminderScheduler } from "@/components/notifications/ReminderScheduler";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Route changes should start at the top even though the document uses
    // smooth scrolling for in-page anchors.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="min-h-[100dvh]">
      <Sidebar />
      <div className="flex min-h-[100dvh] flex-col lg:pl-[252px]">
        <TopBar />
        <SessionBar />
        <main id="main" className="container-app page-pad flex-1">
          <div key={pathname} className="animate-rise">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
      <AmbientController />
      <ReminderScheduler />
      <SessionWatcher />
    </div>
  );
}
