import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Exchanges the magic-link code for a session, then sends the user back
// to the app. Supabase email templates should point to
// `{{ .SiteURL }}/auth/callback?code={{ .TokenHash }}...` — the default
// "Confirm signup" / "Magic Link" templates already do this.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
