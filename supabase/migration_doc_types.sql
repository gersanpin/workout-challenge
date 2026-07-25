-- Migration: document type + source mode for CV vs portfolio flows
-- Run in Supabase SQL editor after schema.sql

alter table public.portfolios
  add column if not exists doc_type text not null default 'portfolio';

alter table public.portfolios
  add column if not exists source_mode text not null default 'create';

-- Optional constraints (ignore if already present)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'portfolios_doc_type_check'
  ) then
    alter table public.portfolios
      add constraint portfolios_doc_type_check
      check (doc_type in ('portfolio', 'cv'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'portfolios_source_mode_check'
  ) then
    alter table public.portfolios
      add constraint portfolios_source_mode_check
      check (source_mode in ('create', 'redesign'));
  end if;
end $$;
