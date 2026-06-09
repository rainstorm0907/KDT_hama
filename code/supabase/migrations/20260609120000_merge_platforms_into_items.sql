-- platforms 테이블을 items.platform_name 컬럼으로 흡수합니다.

alter table public.items
  add column if not exists platform_name text;

update public.items as i
set platform_name = p.platform_name
from public.platforms as p
where i.platform_id = p.platform_id
  and (i.platform_name is null or btrim(i.platform_name) = '');

update public.items
set platform_name = 'unknown'
where platform_name is null or btrim(platform_name) = '';

alter table public.items
  alter column platform_name set not null;

alter table public.items
  drop constraint if exists uq_items_platform_original;

alter table public.items
  drop constraint if exists items_platform_id_fkey;

drop index if exists public.idx_items_platform_id;

alter table public.items
  drop column if exists platform_id;

alter table public.items
  add constraint uq_items_platform_original unique (platform_name, original_id);

create index if not exists idx_items_platform_name
  on public.items (platform_name);

drop policy if exists "public read platforms" on public.platforms;

drop table if exists public.platforms;
