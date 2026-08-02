-- Optional Storage policies for bucket portfolio-assets
-- Create the bucket in the dashboard first (public).

insert into storage.buckets (id, name, public)
values ('portfolio-assets', 'portfolio-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Users upload own folder" on storage.objects;
create policy "Users upload own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'portfolio-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own folder" on storage.objects;
create policy "Users update own folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'portfolio-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users read own folder" on storage.objects;
create policy "Users read own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'portfolio-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own folder" on storage.objects;
create policy "Users delete own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'portfolio-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Public read portfolio assets" on storage.objects;
create policy "Public read portfolio assets"
on storage.objects for select to public
using (bucket_id = 'portfolio-assets');
