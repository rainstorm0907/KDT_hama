-- Catch-up migration: add columns that were defined in the base schema CREATE TABLE
-- statements but never reached existing databases, because `create table if not exists`
-- is a no-op once the table already exists.
--
-- Missing columns detected against the live database (project kgpkcvuawbpgdcyykfdk):
--   platforms.is_active
--   items.sold_at, items.url_checked_at, items.url_status, items.last_seen_at
--   chat_history.intent, chat_history.response_type
--
-- All additions are additive and idempotent; defaults backfill existing rows.

alter table public.platforms
  add column if not exists is_active boolean not null default true;

alter table public.items
  add column if not exists sold_at timestamptz,
  add column if not exists url_checked_at timestamptz,
  add column if not exists url_status text,
  add column if not exists last_seen_at timestamptz not null default now();

alter table public.chat_history
  add column if not exists intent text,
  add column if not exists response_type text;
