-- Migration: document type + source mode for CV vs portfolio flows
-- Safe to run AFTER schema.sql + storage.sql on an existing database.
-- Idempotent: re-running does not fail.
--
-- Cases covered:
-- 1) Fresh DB with current schema.sql (columns + checks already exist) → no-op
-- 2) Older DB without doc_type/source_mode → adds columns + named checks
-- 3) Re-run → ADD COLUMN IF NOT EXISTS + constraint name guards

alter table public.portfolios
  add column if not exists doc_type text;

alter table public.portfolios
  add column if not exists source_mode text;

-- Backfill nulls then enforce defaults/NOT NULL (safe if already NOT NULL)
update public.portfolios set doc_type = 'portfolio' where doc_type is null;
update public.portfolios set source_mode = 'create' where source_mode is null;

alter table public.portfolios
  alter column doc_type set default 'portfolio';

alter table public.portfolios
  alter column source_mode set default 'create';

do $$
begin
  -- Only set NOT NULL if column allows nulls
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'portfolios'
      and column_name = 'doc_type' and is_nullable = 'YES'
  ) then
    alter table public.portfolios alter column doc_type set not null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'portfolios'
      and column_name = 'source_mode' and is_nullable = 'YES'
  ) then
    alter table public.portfolios alter column source_mode set not null;
  end if;
end $$;

-- Named checks (skip if already present — including names from schema.sql)
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
