import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "./config";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Server-side client for Route Handlers (e.g. the auth callback). Returns
// null when Supabase isn't configured so callers can degrade gracefully.
export async function getSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render — middleware refreshes
            // the session instead, so this can be safely ignored.
          }
        },
      },
    }
  );
}
