-- Disable plan limits in an already-deployed database.
-- Safe / idempotent. Run in Supabase SQL editor.
--
-- The app no longer enforces max_portfolios / credits in code.
-- This updates the reference `plans` table so DB values match.

update public.plans
set
  max_portfolios = 2147483647,
  max_published = 2147483647,
  ai_credits_per_month = 2147483647,
  pdf_exports_per_month = 2147483647,
  name = case
    when id = 'free' then 'Gratis (ilimitado)'
    when id = 'pro' then 'Pro (ilimitado)'
    else name
  end
where id in ('free', 'pro');

-- Drop any custom enforcement triggers if present (no-op if missing)
drop trigger if exists enforce_portfolio_limit on public.portfolios;
drop function if exists public.enforce_portfolio_limit();
drop trigger if exists check_plan_limits on public.portfolios;
drop function if exists public.check_plan_limits();
