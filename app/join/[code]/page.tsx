import { redirect } from "next/navigation";

// A nicer share URL (/join/ABCD1234) than the query-param form the app
// actually reads (/?join=ABCD1234) — this just forwards immediately. The
// single-page app in app/page.tsx owns the whole join flow (preview the
// team, prompt sign-in if needed, join) so there's no separate UI here.
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/?join=${encodeURIComponent(code)}`);
}
