# The Shelf

A personal vinyl record collection tracker with a realistic on-screen turntable. Search or scan records into your collection via Discogs, upload your own converted audio, and play it back by dragging the tonearm onto the platter.

Built with Next.js (App Router) + React + Tailwind, Supabase (Postgres, Storage, Auth), and the Discogs API.

## Features

- **Turntable player** — tilted product-shot deck with a layered plinth, grooved platter, strobe ring, power LED, and a draggable tonearm (pointer events, works on touch). A 33⅓/45 RPM switch changes the actual spin animation speed.
- **Add records** three ways: Discogs search, barcode scan (camera), or manual entry with your own sleeve photo.
- **Pressing match** — Discogs search returns specific pressings (label, catalog number, country, year) so you can pick the exact copy you own, then pulls marketplace lowest price, have/want counts, and community rating for that release.
- **The Shelf** — a searchable, sortable grid of your collection, synced to Supabase.
- **Your own audio** — upload an audio file you already own (a rip/conversion) per record; dropping the needle plays it, with an optional vinyl-crackle layer generated with the Web Audio API.

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
2. In the SQL Editor, run the migration in [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql). It creates the `records` table with row-level security scoped to the signed-in user, and two private Storage buckets (`record-photos`, `record-audio`) with matching per-user policies.
3. In **Authentication → URL Configuration**, add your local (`http://localhost:3000/auth/confirm`) and deployed (`https://your-app.vercel.app/auth/confirm`) redirect URLs.
4. Copy your Project URL and anon key from **Project Settings → API**.

### 3. Get a Discogs token

Register an app at [discogs.com/settings/developers](https://www.discogs.com/settings/developers) and copy its personal access token. Discogs limits authenticated requests to 60/min — the app caches search/release lookups for 5 minutes server-side to stay well under that.

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

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. Set the project root to `shelf/` if deploying from this monorepo.
3. Add the same environment variables from `.env.local` in the Vercel project settings (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DISCOGS_TOKEN`, `DISCOGS_USER_AGENT`).
4. Add the deployed `https://your-app.vercel.app/auth/confirm` URL to Supabase's redirect allow-list (step 2.3 above).
5. Deploy. Vercel serves everything over HTTPS by default, which the barcode camera (`getUserMedia`) requires.

## Notes

- The Discogs token is only ever read in server-side code (`src/lib/discogs.ts`, used by the `src/app/api/discogs/*` routes) — it's never sent to the browser.
- Auth is magic-link (passwordless), single-user by design: Postgres row-level security and Storage policies key every row/object to `auth.uid()`, so the app is safe to leave on a public URL even though only one person is expected to use it.
- Photo/audio uploads go to private Storage buckets; the app stores a long-lived signed URL rather than re-generating one on every read, which keeps the Shelf grid and turntable simple at the cost of needing a fresh upload if a URL ever needs to be revoked.
