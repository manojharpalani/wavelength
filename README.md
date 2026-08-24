# Wavelength

A single self-contained `index.html` — no build step, no dependencies. This is a
standalone port of the Wavelength design (originally built as a Claude Design
canvas prototype) into plain HTML/CSS/JS so it can run anywhere, including Vercel.

## Deploy to Vercel

You'll need a (free) Vercel account — sign up or log in at https://vercel.com.

### Option A — fastest, no install (dashboard)

1. Go to https://vercel.com/new
2. Choose "Deploy" via drag-and-drop, or click the option to upload a folder,
   and select this `wavelength-vercel` folder (just `index.html` + this README).
3. Framework preset: leave as "Other" — it's a static site, no build command needed.
4. Click **Deploy**. You'll get a live `*.vercel.app` URL in under a minute.

### Option B — CLI

1. Install the CLI (one-time): `npm i -g vercel`
2. From inside this folder, run:
   ```
   vercel
   ```
3. Follow the prompts — log in (or create an account) when asked, accept the
   defaults for project name and settings.
4. When it finishes, you'll get a preview URL. To make it live at your
   permanent `*.vercel.app` address, run:
   ```
   vercel --prod
   ```

### Option C — GitHub (best for ongoing changes)

1. Push this folder to a new GitHub repo.
2. In the Vercel dashboard, click **Add New → Project**, then **Import** your
   GitHub repo.
3. Leave the framework preset as-is (static site) and click **Deploy**.
4. From then on, every push to the repo redeploys the site automatically.

## Custom domain

Once deployed, open the project in the Vercel dashboard → **Settings → Domains**
to attach a domain you own (e.g. `wavelength.yourdomain.com`).

## Background audio

There's a small play/pause button fixed in the top-right corner that controls
a background track via YouTube's embed player (the video itself stays
invisible off-screen — only audio is audible). It's set to attempt autoplay
on load, but note: every modern browser blocks unmuted autoplay on a
visitor's *first* visit to a site — that's a platform-level policy, not
something any site can override. So in practice: on some visits it'll start
playing immediately, and on others the button will show "play" and start
the moment someone clicks it. The icon always reflects what's actually
playing. If you'd rather not deal with that inconsistency, the safest fix is
to drop `autoplay: 1` from `playerVars` in the script and let people opt in
with a click every time.

To swap the track, replace the video ID (`7jfMnh9c_d4`) in the
`onYouTubeIframeAPIReady` function with a different YouTube video ID — make
sure you have the right to use whatever you swap in for background music on
a public page.

## Editing the copy or design

Everything — markup, styles, and logic — lives in `index.html`. There's no
framework or build tooling: open it in any editor, change the HTML strings in
the `render...()` functions or the CSS in the `<style>` block, save, and
redeploy (`vercel --prod`, or just push to GitHub if you used Option C).
