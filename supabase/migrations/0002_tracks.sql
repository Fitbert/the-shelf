-- Phase 2: per-track playback. One record has many tracks; playback moves
-- from "one audio file per record" to skipping between tracks on an album.

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records (id) on delete cascade,
  position int not null,
  title text not null,
  duration_seconds int,
  audio_url text,
  created_at timestamptz not null default now()
);

create index if not exists tracks_record_id_idx on public.tracks (record_id);
create index if not exists tracks_record_id_position_idx on public.tracks (record_id, position);

alter table public.tracks enable row level security;

-- Tracks have no user_id of their own — ownership is checked through the
-- parent record, same as everything else in this single-user app.
create policy "Owner can select own tracks"
  on public.tracks for select
  using (exists (select 1 from public.records r where r.id = tracks.record_id and r.user_id = auth.uid()));

create policy "Owner can insert own tracks"
  on public.tracks for insert
  with check (exists (select 1 from public.records r where r.id = tracks.record_id and r.user_id = auth.uid()));

create policy "Owner can update own tracks"
  on public.tracks for update
  using (exists (select 1 from public.records r where r.id = tracks.record_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.records r where r.id = tracks.record_id and r.user_id = auth.uid()));

create policy "Owner can delete own tracks"
  on public.tracks for delete
  using (exists (select 1 from public.records r where r.id = tracks.record_id and r.user_id = auth.uid()));
