"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "./config";

// Single shared browser client. Returns null when Supabase isn't
// configured (no env vars set) so the rest of the app can degrade
// gracefully instead of crashing — same pattern as the AI assist feature
// when ANTHROPIC_API_KEY is unset.
let client: ReturnType<typeof createBrowserClient> | null | undefined;

export function getSupabaseBrowserClient() {
  if (client !== undefined) return client;
  if (!isSupabaseConfigured()) {
    client = null;
    return client;
  }
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}
