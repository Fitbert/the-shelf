# The Shelf

A personal vinyl record collection tracker with a realistic on-screen turntable. Search or scan records into your collection via Discogs, upload your own converted audio, and play it back by dragging the tonearm onto the platter.

Built with Next.js (App Router) + React + Tailwind, Supabase (Postgres, Storage, Auth), and the Discogs API.

## Status

**Phase 1: complete and live.** Deployed to Vercel, verified end-to-end on a real device: sign-in, adding records all four ways, audio upload/playback, persistent mini-player + Media Session lock-screen controls, and home-screen install. No known bugs.

**Phase 2: per-track playback shipped.** Records now hold a track list instead of one audio file per album — see [Features](#features) below. Run [`0002_tracks.sql`](./supabase/migrations/0002_tracks.sql) against your Supabase project to pick it up (step 2 in Setup).

## Features

- **Turntable player** — tilted product-shot deck with a layered plinth, grooved platter, strobe ring, power LED, and a draggable tonearm (pointer events, works on touch). A 33⅓/45 RPM switch changes the actual spin animation speed.
- **Add records** four ways: Discogs search, barcode scan (camera), manual entry with your own sleeve photo, or bulk-importing a public Discogs collection.
- **Pressing match** — Discogs search returns specific pressings (label, catalog number, country, year) so you can pick the exact copy you own, then pulls marketplace lowest price, have/want counts, and community rating for that release.
- **The Shelf** — a searchable, sortable grid of your collection, synced to Supabase.
- **Per-track playback** — records hold a real track list (`tracks` table) rather than one audio file per album. Adding via Discogs search/scan seeds the tracklist automatically; manual entries get tracks added from the detail sheet. Upload audio per track there too, and the turntable/mini-player skip between tracks (including from the lock screen via Media Session's next/previous). A record with no tracks yet falls back to playing its own legacy `audio_url`, so anything added before Phase 2 keeps working unchanged.
- **Persistent playback** — audio survives switching between the Turntable and Shelf tabs via a mini-player, and the Media Session API wires up lock-screen/bluetooth play, pause, seek, and track-skip controls.
- **Installable** — a generated manifest and icons let you add it to your phone's home screen as a standalone app.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS v4
- Supabase: Postgres (`records` table), Storage (photos + audio), Auth (magic link, single user)
- Discogs API for search/pressing lookup/marketplace pricing (server-side only)
- `html5-qrcode` for camera barcode scanning

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migrations in [`supabase/migrations/`](./supabase/migrations/) in order: [`0001_init.sql`](./supabase/migrations/0001_init.sql) creates the `records` table with row-level security scoped to the signed-in user, and two private Storage buckets (`record-photos`, `record-audio`) with matching per-user policies; [`0002_tracks.sql`](./supabase/migrations/0002_tracks.sql) adds the `tracks` table (one record has many tracks), with RLS enforced through the parent record's ownership.
3. In **Authentication → URL Configuration**, add your local (`http://localhost:3000/auth/confirm`) and deployed (`https://your-app.vercel.app/auth/confirm`) redirect URLs.
4. Copy your Project URL and anon key from **Project Settings → API**.

### 3. Get Discogs credentials

Register an app at [discogs.com/settings/developers](https://www.discogs.com/settings/developers) ("create an application") and copy its **Consumer Key** and **Consumer Secret** — that's all this app needs (Discogs' simple key/secret auth, no OAuth handshake, since this only ever acts as you). Discogs limits authenticated requests to 60/min — the app caches search/release lookups for 5 minutes server-side to stay well under that.

### 4. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the values from steps 2 and 3:

```bash
cp .env.local.example .env.local
```

### 5. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in with a magic link sent to your own email, and start adding records.

## Deploy (Vercel)

1. Import this repo into [Vercel](https://vercel.com/new) — it's a standalone repo, so the default project root is correct.
2. Add the same environment variables from `.env.local` in the Vercel project settings (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DISCOGS_CONSUMER_KEY`, `DISCOGS_CONSUMER_SECRET`, `DISCOGS_USER_AGENT`).
3. Add the deployed `https://your-app.vercel.app/auth/confirm` URL to Supabase's redirect allow-list (step 2.3 above).
4. Deploy. Vercel serves everything over HTTPS by default, which the barcode camera (`getUserMedia`) requires.

## Roadmap (Phase 3)

- **Bulk-import tracklists.** Bulk-importing a public Discogs collection doesn't pull tracklists (same reason it skips pricing/ratings — that's a per-release API call per item, and a big collection would blow the 60 req/min budget). Search and barcode-scan adds do get tracklists automatically; a bulk-imported record can still have tracks added by hand from its detail sheet.
- **Now-playing visual polish.** The current track name on the Turntable (`Track X of Y · title`, in `TurntablePlayer.tsx`) renders thin/low-contrast and is hard to read at a glance. Wants a real visual pass — heavier weight or better contrast at minimum, and the user's asked for something more motion/visually-interactive in general for the now-playing display (not scoped further yet — worth a proper design pass rather than a quick tweak).

## Notes

- The Discogs consumer key/secret are only ever read in server-side code (`src/lib/discogs.ts`, used by the `src/app/api/discogs/*` routes) — they're never sent to the browser.
- Auth is magic-link (passwordless), single-user by design: Postgres row-level security and Storage policies key every row/object to `auth.uid()`, so the app is safe to leave on a public URL even though only one person is expected to use it.
- Photo/audio uploads go to private Storage buckets; the app stores a long-lived signed URL rather than re-generating one on every read, which keeps the Shelf grid and turntable simple at the cost of needing a fresh upload if a URL ever needs to be revoked.
