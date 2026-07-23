-- The Shelf: collection table + storage buckets, scoped to the authenticated owner.

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  artist text not null,
  catalog_number text,
  pressing_country text,
  pressing_year int,
  discogs_release_id text,
  lowest_price numeric,
  have_count int,
  want_count int,
  community_rating numeric,
  community_rating_count int,
  photo_url text,
  audio_url text,
  created_at timestamptz not null default now()
);

create index if not exists records_user_id_idx on public.records (user_id);
create index if not exists records_created_at_idx on public.records (created_at desc);

alter table public.records enable row level security;

create policy "Owner can select own records"
  on public.records for select
  using (auth.uid() = user_id);

create policy "Owner can insert own records"
  on public.records for insert
  with check (auth.uid() = user_id);

create policy "Owner can update own records"
  on public.records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owner can delete own records"
  on public.records for delete
  using (auth.uid() = user_id);

-- Storage buckets for sleeve photos and the owner's own converted audio files.
insert into storage.buckets (id, name, public)
values ('record-photos', 'record-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('record-audio', 'record-audio', false)
on conflict (id) do nothing;

-- Files are stored under a per-user folder: {user_id}/{filename}
create policy "Owner can manage own photos"
  on storage.objects for all
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owner can manage own audio"
  on storage.objects for all
  using (bucket_id = 'record-audio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'record-audio' and (storage.foldername(name))[1] = auth.uid()::text);
