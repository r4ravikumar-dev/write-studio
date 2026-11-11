-- Studio: the private bucket for every Studio upload. Separate from the
-- legacy public case-study-media bucket, which is not touched.
--
-- Access model (Django auth, see 0005): users never hold a Supabase session,
-- so this bucket has NO storage.objects policies at all. anon/authenticated
-- can't list, read, write or sign anything in it; only the Express API's
-- service role can. Express:
--   * creates one-time signed UPLOAD urls only for paths it generates under
--     {owner_id}/{workspace_id}/{case-study-id|library}/{uuid}.{ext},
--   * checks each stored object (size, type, owner folder) before recording
--     it in public.studio_assets, and removes it if that fails,
--   * streams files back only to the signed-in owner (Next.js route
--     /studio/media/...), never as public or signed read links.
--
-- SVG is not allowed (it can carry scripts). Run after 0005-0007.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio-private-media',
  'studio-private-media',
  false,
  52428800,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Guard: fail loudly if any policy ever grants access to this bucket.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || coalesce(with_check, '')) like '%studio-private-media%'
  ) then
    raise exception 'studio-private-media must have no storage policies (access is only via the Express API)';
  end if;
end;
$$;
