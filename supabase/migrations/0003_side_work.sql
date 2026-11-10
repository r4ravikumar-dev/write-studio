-- Side work: the photos in the looping ticker on Home and Work.
-- Each one is a picture (stored in case-study-media under side-work/) and a
-- description. The description isn't shown on the site; it's the picture's
-- alt text, read out by screen readers.
create table if not exists public.side_work (
  id          uuid primary key default gen_random_uuid(),
  image_path  text not null,                 -- path inside case-study-media
  width       integer,
  height      integer,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists side_work_created_idx on public.side_work (created_at desc);

alter table public.side_work enable row level security;

drop policy if exists "Side work is public" on public.side_work;
create policy "Side work is public"
  on public.side_work for select
  using (true);

drop policy if exists "Owner manages side work" on public.side_work;
create policy "Owner manages side work"
  on public.side_work for all
  using (public.is_cms_owner())
  with check (public.is_cms_owner());

-- Tell the API about the new table straight away.
notify pgrst, 'reload schema';
