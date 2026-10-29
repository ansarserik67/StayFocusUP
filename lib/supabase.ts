"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/** True when both public Supabase variables were present at build time. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

/**
 * Browser client. Returns null during SSR, so providers can render on the
 * server without touching localStorage or the network.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || typeof window === "undefined") return null;
  if (!cached) {
    cached = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return cached;
}

export function authCallbackUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const origin = typeof window !== "undefined" ? window.location.origin : configured;
  return `${origin ?? ""}/auth/callback`;
}
