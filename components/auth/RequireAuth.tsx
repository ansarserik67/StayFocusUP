"use client";

import type { ReactNode } from "react";

import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFocus } from "@/components/focus/FocusProvider";
import { AppShell } from "@/components/layout/AppShell";
import { AppSkeleton } from "@/components/layout/AppSkeleton";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const { hydrated } = useFocus();

  if (!ready || !hydrated) return <AppSkeleton />;
  if (!user) return <AuthGate />;
  return <AppShell>{children}</AppShell>;
}
