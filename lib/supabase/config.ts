// Whether Supabase env vars are present. Both are safe to read on the
// client (NEXT_PUBLIC_*) — the anon key is meant to be public; row-level
// security in the database is what actually protects the data.
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
