-- Keep items.platform_id consistent with items.platform_name automatically.
--
-- platform_name is the single source of truth (Python ingestion writes it).
-- The live Spring/JPA layer still resolves platform through the platform_id FK join
-- (Item.platform -> platforms), so rows inserted with only platform_name would be
-- invisible to Spring's platform-based lookups. This BEFORE trigger derives
-- platform_id from platform_name on every insert/update, registering the platform
-- in public.platforms when it is new. The reverse direction (platform_id only) is
-- also backfilled so either writer stays consistent.

create or replace function public.items_sync_platform()
returns trigger
language plpgsql
as $$
declare
  resolved_id bigint;
begin
  if new.platform_name is not null and length(trim(new.platform_name)) > 0 then
    select platform_id into resolved_id
      from public.platforms
     where platform_name = new.platform_name;

    if resolved_id is null then
      insert into public.platforms (platform_name)
        values (new.platform_name)
        on conflict (platform_name) do update set platform_name = excluded.platform_name
        returning platform_id into resolved_id;
    end if;

    new.platform_id := resolved_id;
  elsif new.platform_id is not null then
    select platform_name into new.platform_name
      from public.platforms
     where platform_id = new.platform_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_items_sync_platform on public.items;
create trigger trg_items_sync_platform
  before insert or update on public.items
  for each row execute function public.items_sync_platform();
