-- Align the live `items` table with the Python ingestion pipeline as the source of truth.
--
-- The active stack (FastAPI reads + crawling import) keys items by `platform_name`
-- (lib/supabase_import.py upserts on_conflict="platform_name,original_id";
--  lib/supabase_repository.py reads with .eq("platform_name", ...)). It never touches
-- platform_id. This migration adds the columns the pipeline writes, backfills the
-- denormalized platform_name for existing rows, relaxes the legacy platform_id, and
-- adds the unique key the upsert depends on.
--
-- platform_id (FK to platforms) is kept but made nullable for backward compatibility
-- with the Spring/JPA entity layer, which the active Python stack does not run.

-- 1. Columns written by lib/supabase_import.py build_item_payloads + rating_payload
alter table public.items
  add column if not exists platform_name text,
  add column if not exists cluster_product_name text,
  add column if not exists rating numeric,
  add column if not exists cluster_score numeric,
  add column if not exists price_score numeric,
  add column if not exists view_score numeric,
  add column if not exists recency_score numeric,
  add column if not exists cluster_confidence numeric,
  add column if not exists view_count integer not null default 0;

-- 2. Backfill platform_name on existing rows so the new conflict key matches and
--    re-ingestion updates in place instead of inserting duplicates.
update public.items i
   set platform_name = p.platform_name
  from public.platforms p
 where i.platform_id = p.platform_id
   and i.platform_name is null;

-- 3. Python ingestion never supplies platform_id; relax the legacy NOT NULL.
alter table public.items
  alter column platform_id drop not null;

-- 4. Unique key backing on_conflict="platform_name,original_id".
create unique index if not exists uq_items_platform_name_original
  on public.items (platform_name, original_id);
